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
 * - end: parsing done
 * - error: Something broke.
 *
 * The basic usage of the parser is this:
 *
 * 1. Create a new parser with `new IfParser(rule)`
 * 2. Attach event listeners to the parser.
 * 3. Run `parse()`
 *
 * The parser is a recursive descent parsers. It begins with a top level
 * rule (`rule()`) and attempts to follow the grammer in RFC 4918.
 */
function IfParser(rule, logger) {
  //this.d("Scanning: "+ rule);
  this.tokens = rule;
  this.scanner = new Scanner(rule);
  this.logger = logger;
}
module.exports = IfParser;
Util.inherits(IfParser, EventEmitter);

IfParser.prototype.d = function (msg) {
  console.log(msg);
}

/**
 * Parse the rule, emitting events as we go.
 */
IfParser.prototype.parse = function () {
  //this.d('Parse');
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

/**
 * Top-level rule.
 *
 * This is the first rule called by the parser.
 */
IfParser.prototype.rule = function () {
  //this.d('->rule()');
  // queue the first token:
  this.scanner.nextToken();

  this.consumeWhitespace();
  // Spec says we can only do one or the other.
  this.tagList() || this.noTagList();

  //this.d('<-rule()');
}

/**
 * Parse lists that have no resource tag.
 *
 * This is exclusive of tagList().
 */
IfParser.prototype.noTagList = function () {
  //this.d('noTagList');
  while (this.list())  {
    this.consumeWhitespace();
    // Loop as long as we keep finding lists.
  }
}

/**
 * Parse lists that have a resource tag.
 *
 * This is exclusive of noTagList().
 */
IfParser.prototype.tagList = function () {
  //this.d('tagList');
  if (this.resourceTag()) {
    this.consumeWhitespace();
    while(this.list()) {
      this.consumeWhitespace();
    }
    // Recurse to get more resource tags. This allows
    // for a series of resource tag rules.
    this.tagList();
    return true;
  }
  return false;
}

/**
 * Get a list of conditions.
 */
IfParser.prototype.list = function() {
  // this.d('  ->list ' + this.scanner.token);
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
    this.scanner.nextToken();
    this.emit('endList');
    // this.d('  <-list');
    return true;
  }
  return false;
}

/**
 * Parse a resource tag.
 */
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

/**
 * Parse a state token (lock ID).
 */
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

/**
 * Parse conditions, where a condition may be Not, an ETag, or a State
 * Token.
 */
IfParser.prototype.condition = function () {
  // this.d('    ->condition');
  this.consumeWhitespace();
  this.notTag();
  this.stateToken();
  this.eTag();
  // this.d('    <-condition');
}

/**
 * Parse a negation.
 */
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

/**
 * Parse an ETag.
 *
 * ETags may be strong or weak:
 *
 * - "strong"
 * - W/"weak"
 */
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
 *
 * This throws no events, since whitespace is incidental.
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

/**
 * Build a character sequence containing everything up to the stopping
 * condition or EOF.
 */
IfParser.prototype.charsUntil = function (stop) {
  var buffer = '';
  while (this.scanner.token != stop) {
    buffer += this.scanner.token;

    // We hit the end of the token sequence.
    if(!this.scanner.nextToken()) {
      // this.d('Premature end of token sequence.');
      return buffer;
    }
  }
  return buffer;
}

/**
 * The scanner.
 *
 * This is private.
 */
function Scanner(str) {
  this.tokens = str;
  this.pos = -1;
  this.token = '';
  this.done = false;
}

/**
 * Read the next token into the buffer.
 */
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

/**
 * Check whether the token is a char.
 *
 * This checks Basic Plane unicode for UTF-8.
 */
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

