var dom = require('domxml');
/**
 * A WebDAV resource lock.
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
  if (!doc) {
    doc = new DOMParser().parseFromString(markup.join("\n"));
  }
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
