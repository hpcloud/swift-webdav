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

Lock.prototype.toXML = function () {
}

Lock.prototype.isExpired = function () {
  return Date.now() > this.expires;
}
