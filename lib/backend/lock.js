var dom = require('xmldom');
var UUID = require('node-uuid');
/**
 * A WebDAV resource lock.
 *
 * TODO: convert type and scope to integers.
 */
function Lock() {}

Lock.WRITE = 'write';
Lock.SHARED = 'shared';
Lock.EXCLUSIVE = 'exclusive';

Lock.prototype.type = Lock.WRITE;
Lock.prototype.scope = Lock.SHARED;
Lock.prototype.owner = '';
Lock.prototype.depth = 0;
Lock.prototype.timeout = 0;
Lock.prototype.expires = 0;
Lock.prototype.token = '';
Lock.prototype.root = '';

Lock.prototype.isExpired = function () {
  return Date.now() > this.expires;
}

Lock.prototype.isExclusive = function () {
  return this.scope == Lock.EXCLUSIVE;
}

Lock.prototype.isShared = function () {
  return this.scope == Lock.SHARED;
}

Lock.prototype.headerToken = function () {
  return '<' + this.token + '>';
}

/**
 * Generate an XML Lock object.
 *
 * @return {xmldom.DOM}
 *   A DOM.
 */
Lock.prototype.toXML = function () {

  // Writing DOMs by hand sucks. Markup is easier.
  // Operating on the perhaps outdated assumption that array
  // concatenation is faster than string concatenation.
  var markup = [
    '<?xml version="1.0" encoding="utf-8" ?><D:prop xmlns:D="DAV:"><D:lockdiscovery>',
      '<D:activelock>',
        '<D:locktype><D:' + this.type + '/></D:locktype>',
        '<D:lockscope><D:' + this.scope + '/></D:lockscope>',
        '<D:locktoken><D:href>' + this.token + '</D:href></D:locktoken>',
        '<D:lockroot><D:href>' + this.root+ '</D:href></D:lockroot>',
        '<D:depth>' + this.depth + '</D:depth>',
        '<D:owner>' + this.owner + '</D:owner>',
        '<D:timeout>' + this.timeout + '</D:timeout>',
      '</D:activelock>',
    '</D:lockdiscovery></D:prop>'
  ];
  doc = new DOMParser().parseFromString(markup.join("\n"));
  return doc;

  /* This is why the DOM sucks.
  var ns = 'DAV:';
  var activeEle = doc.createElementNS(ns, 'D:activelock');
  var ltEle = doc.createElementNS(ns, 'D:locktype');
  var typeEle = doc.createElementNS(ns, 'D:' + this.type);
  var lsEle = doc.createElementNS(ns, 'D:lockscope');
  var scopeEle = doc.createElementNS(ns, 'D:' + this.scope);
  var depth = doc.createElementNS(ns, 'D:depth');
  var depthText = doc.createTextNode(this.depth);
  var ownerEle = doc.createElementNS(ns, 'D:owner');
  var timeoutEle = doc.createElementNS(ns, 'D:timeout');
  var timeoutText = doc.createTextNode(this.timeout);
  var locktokenEle = doc.createElementNS(ns, 'D:locktoken');
  var hrefEle = doc.createElementNS(ns, 'href');
  var hrefText = doc.createTextNode(this.token);
  var lockrootEle // too... bored... to... continue...
 */
}

Lock.generateToken = function() {
  return UUID.v4();
}

/**
 * Unserialize a Lock.
 */
Lock.reconstitute = function (obj) {
  // Only copy properties that already exist. This might be an
  // unnecessary precaution.
  var l = new Lock();
  for (key in obj) {
    if (l[key] && typeof l[key] != 'function') {
      l[key] = obj[key];
    }
  }
  return l;
}

Lock.fromXML = function (doc) {
  var ns = 'DAV:';
  var lockinfoNL = doc.getElementByTagNameNS(ns, 'lockinfo');
  if (lockinfoNL.length == 0) {
    return;
  }

  var info = lockinfoNL.item(0);

  function _kid(node, name) {
    for (var i = 0; i < node.childNodes.length; ++i) {
      var k = node.childNodes.item(i);
      if (k.nodeType == 1 && k.localName == name) {
        return k;
      }
    }
  }
  function _contents(node) {
    var c = [];
    for (var i = 0; i < node.childNodes.length; ++i) {
      c.push(dom.serializeToString(node.childNodes.item(i)));
    }
    return c.join('');
  }

  var lockscopeEle = _kid(info, 'lockscope');
  var ownerEle = _kid(info, 'owner');

  // Spec does not indicate that this can be sent from client.
  // var timeoutEle = _kid(info, 'timeout');

  var newLock = new Lock();
  // var locktypeEle = _kid(info, 'locktype');
  // newLock.type = _kid(locktypeEle, 'write') ? Lock.WRITE : Lock.WHAT ;

  newLock.scope = _kid(lockscopeEle, 'exclusive') ? Lock.EXCLUSIVE : Lock.SHARED;
  newLock.owner = _contents(ownerEle);
}

/**
 * D:supportedlock property value.
 */
Lock.supportedLock = 
   '<D:supportedlock>'+
     '<D:lockentry>'+
       '<D:lockscope><D:exclusive/></lockscope>'+
       '<D:locktype><D:write/></locktype>'+
     '</D:lockentry>'+
     '<D:lockentry>'+
       '<D:lockscope><D:shared/></lockscope>'+
       '<D:locktype><D:write/></locktype>'+
     '</D:lockentry>'+
   '</D:supportedlock>'
;
