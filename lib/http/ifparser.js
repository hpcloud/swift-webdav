var Util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Parse the WebDAV extended If header.
 *
 * For grammar, see http://tools.ietf.org/html/rfc4918#section-10.4
 *
 * Emits:
 * - resourceTag: A resource tag -- a URI to a resource.
 * - startList: Start a list
 * - not: Indicates Not was found.
 * - stateToken: A lock ID (state token)
 * - eTag: An ETag. This may be in double-quotes.
 * - endList: End a list
 * - end: parsing done.
 */
function IfParser(rule, logger) {
  this.d("Scanning: "+ rule);
  this.tokens = rule;
  this.scanner = new Scanner(rule);
  this.logger = logger;
}
module.exports = IfParser;
Util.inherits(IfParser, EventEmitter);

IfParser.prototype.d = function (msg) {
  console.log(msg);
}

IfParser.prototype.parse = function () {
  this.d('Parse');
  this.position = 0;
  try {
    this.rule();
    this.emit('end');
  }
  catch (e) {
    if (e) {
      this.emit('error', e);
      return;
    }
  }


}

IfParser.prototype.rule = function () {
  this.d('->rule()');
  // queue the first token:
  this.scanner.nextToken();

  this.consumeWhitespace();
  // Spec says we can only do one or the other.
  this.tagList() || this.noTagList();

  this.d('<-rule()');
}

IfParser.prototype.noTagList = function () {
  this.d('noTagList');
  this.list();
}

IfParser.prototype.tagList = function () {
  this.d('tagList');
  if (this.resourceTag()) {
    this.consumeWhitespace();
    this.list();
    return true;
  }
  console.log("No tagged resource");
  return false;
}

IfParser.prototype.resourceTag = function () {
  if (this.scanner.token  == '<') {
    this.scanner.nextToken();
    var resTag = this.charsUntil('>');
    if (this.scanner.token != '>') {
      throw new Error('Expected ">", got ' + this.scanner.token);
    }

    this.emit('resourceTag', resTag);
    this.scanner.nextToken();
    return true;
  }
  return false;
}

IfParser.prototype.stateToken = function () {
  if (this.scanner.token  == '<') {
    this.scanner.nextToken();
    var lockId = this.charsUntil('>');
    if (this.scanner.token != '>') {
      throw new Error('Expected ">", got ' + this.scanner.token);
    }

    this.emit('stateToken', lockId);
    this.scanner.nextToken();

  }
}

IfParser.prototype.simpleRef = function () {
  var buff = '';
  var hasMoreChars = true;
  while (this.scanner.isCharToken() && hasMoreChars) {
    this.d("Char token: " + this.scanner.token);
    buff += this.scanner.token;
    hasMoreChars = this.scanner.nextToken();
  }
  console.log("Simple ref: %s", buff);
}

IfParser.prototype.list = function() {
  this.d('  ->list');
  if (this.scanner.token == '(') {
    this.emit('startList');
    this.scanner.nextToken();

    // Make sure that we progress.
    var lastPos = -1;
    while (this.scanner.token != ')' && !this.scanner.done && lastPos != this.scanner.pos) {
      lastPos = this.scanner.pos;
      this.condition();

    }
    if( this.scanner.token != ')') {
      throw new Error('Expected List End (")"), got ' + this.scanner.token);
    }
    this.emit('endList');
    this.d('  <-list');
  }
}

IfParser.prototype.condition = function () {
  this.d('    ->condition');
  this.consumeWhitespace();
  this.notTag();
  this.stateToken();
  this.eTag();
  this.d('    <-condition');
}

IfParser.prototype.notTag = function () {
  var b = '';
  if (this.scanner.token == 'N') {
    this.scanner.nextToken();
    b = this.scanner.token;
    this.scanner.nextToken();
    b += this.scanner.token;
    if (b != 'ot') {
      throw new Error('Expected Not, got N' + b);
    }
    this.emit('not');
    this.scanner.nextToken();

  }
}

IfParser.prototype.eTag = function () {
  if (this.scanner.token == '[') {
    this.scanner.nextToken();
    var eTag = this.charsUntil(']');
    if (this.scanner.token != ']') {
      throw new Error('Expected "]", got ' + this.scanner.token);
    }
    this.emit('eTag', eTag);
    this.scanner.nextToken();
  }
}

/**
 * Consume sequential whitespace.
 */
IfParser.prototype.consumeWhitespace = function () {
  // this.d('consumeWhitespace()');
  var count = 0;
  while (this.scanner.token == " " || this.scanner.token == "\t") {
    //this.d("->");
    if (!this.scanner.nextToken()) {
      return;
    }
    ++count;
  }
  return count;
}

IfParser.prototype.charsUntil = function (stop) {
  var buffer = '';
  while (this.scanner.token != stop) {
    buffer += this.scanner.token;

    // We hit the end of the token sequence.
    if(!this.scanner.nextToken()) {
      this.d('Premature end of token sequence.');
      return buffer;
    }
  }
  return buffer;
}

function Scanner(str) {
  this.tokens = str;
  this.pos = -1;
  this.token = '';
  this.done = false;
}

Scanner.prototype.position = function () {
  return this.pos;
}

//Scanner.prototype.is

Scanner.prototype.nextToken = function () {
  var newPos = this.pos + 1;
  // console.log("%d of %d", newPos, this.tokens.length);
  if (this.tokens.length > newPos) {
    this.pos = newPos;
    this.token = this.value = this.tokens[newPos];
    this.code = this.tokens.charCodeAt[newPos];
    //this.token = Token.char;
    return true;
  }
  //this.recurse = true;
  // console.log("==========DONE===============")
  this.done = true;
  return false;
}

Scanner.prototype.isCharToken = function () {

  // Low control codes
  if (this.code <= 0x001F || this.code == 0x007F) {
    return false;
  }

  // Latin-1 Supplement control codes
  if (this.code >= 0x0080 && this.code < 0x00A0) {
    return false;
  }


  return true;
}

/**
 * A simple reference may contain any characers legal in a URI.
 */
Scanner.prototype.simpleReference = function () {
}
