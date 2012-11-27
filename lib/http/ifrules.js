var IfParser = require('./ifparser');
/**
 * Describe a list of rules from a WebDAV If header.
 */
function IfRules(header) {
  this.header = header;
}
module.exports = IfRules;

/**
 * @return {boolean}
 *   true if this can be modified, false if the rule check fails.
 */
IfRules.prototype.evaluate = function (lock, resource, fn) {
  var parser = this.setupParser(fn);
  var self = this;
  parser.on('error', fn);
  parser.on('end', function () { fn(false, self.rule) });
  parser.parse();
}

IfRules.prototype.setupParser = function () {
  var parser = new IfParser(this.header);
  var rule = this.rule =  [];
  var currentResource = {name: '*', conditions: []};
  var rindex = -1;
  var cindex = 0;
  var negate = false;

  // This may be empty. Can we optimize it out?

  parser.on('resourceTag', function (resourceTag) {
    ++rindex;
    cindex = 0;
    rule.push({name: resourceTag, conditions: []});
  });
  parser.on('startList', function () {
    if (rule.length == 0) {
      rule.push(currentResource);
      ++rindex;
    }
    rule[rindex].conditions[cindex] = {
      'notEtag': [],
      'notToken': [],
      'etag': [],
      'token': []
    };
  });
  parser.on('endList', function () {
    ++cindex;
  });

  parser.on('eTag', function (etag) {
    var c = rule[rindex].conditions[cindex];
    if (negate) {
      c.notEtag.push(etag);
      negate = false;
    }
    else {
      c.etag.push(etag);
    }
  });

  parser.on('stateToken', function (tok) {
    var c = rule[rindex].conditions[cindex];
    if (negate) {
      c.notToken.push(tok);
      negate = false;
    }
    else {
      c.token.push(tok);
    }
  });

  parser.on('not', function () {
    negate = true;
  });

  return parser;
}

// Unused
IfRules.prototype.parseHeader = function () {

  // This is a temporary stub for an event handler and a full recdesc
  // parser.

  // This is from SabreDAV. It doesn't handle full IF logic, but it does
  // enough to pass Litmus.
  //var regex = /(?:\<(?P<uri>.*?)\>\s)?\((?P<not>Not\s)?(?:\<(?P<token>[^\>]*)\>)?(?:\s?)(?:\[(?P<etag>[^\]]*)\])?\)/im;

  // [
  // 0: total match
  // 1: Resource
  // 2: Not
  // 3: Lock ID
  // 4: Etag
  // ] 
  var regex = /^(?:<([^\>]+)?>\s*)?\(\s*(Not)?(?:\s*<([^>]+)>)?\s*(?:\[([^\]]+)\])?\s*\)/im;

  var res = this.header.match(regex);
  console.log('===%s===', this.header);
  //console.log(res);

  if (res == null) return;

  return {
    resource: res[1],
    negated: res[2] != undefined,
    lockId: res[3],
    etag: res[4]
  };


}

