var pronto = require('pronto');
var lutils = require('../backend/lockutils');
/**
 * Handle WebDAV LOCK requests.
 *
 * The LOCK method can do two thins. First, it can create a new lock.
 * This requires that the request have an XML body with a lock object.
 * Second, it can refresh a lock. Such a request has no XML body, but
 * has an If HTTP header.
 *
 * Params:
 * - resourceBridge: A resource bridge (REQUIRED).
 * - xml: The DOM for the XML body. (OPTIONAL)
 * - resource: The current resource. (OPTIONAL)
 * - lock: The Lock object. (OPTIONAL)
 */
function HandleLock() {}
pronto.inheritsCommand(HandleLock);
module.exports = HandleLock;

// One hour.
HandleLock.DEFAULT_LOCK_DURATION = 3600;
// One day.
HandleLock.DEFAULT_MAX_LOCK_DURATION = 86400;
// 2 minutes. Might need to raise
HandleLock.DEFAULT_MIN_LOCK_DURATION = 120;

HandleLock.prototype.execute = function (cxt, params) {
  this.required(params, ['resourceBridge']);

  this.lockStore = cxt.getDatasource('locks');
  this.req = cxt.getDatasource('request');
  this.bridge = params.resourceBridge;
  this.cxt = cxt;

  // The lock token. If present, we do a Refresh.
  this.token = this.lockToken();

  // XML from the client
  this.xml = params.xml;

  // An existing resource
  this.resource = params.resource;

  // An existing lock
  this.lock = params.lock;


  if (!this.xml && this.token) {
    this.refreshLock();
    return;
  }
  // Create
  else if (xml) {
    this.createLock();
    return;
  }
  // Malformed.
  else {
    this.reroute('@400', cxt);
    return;
  }
}

HandleLock.prototype.refreshLock = function () {

  // Get the timeout and adjust it.
  var timeout = this.parseTimeout();
  if (timeout < HandleLock.DEFAULT_MIN_LOCK_DURATION
      || timeout > HandleLock.DEFAULT_MAX_LOCK_DURATION) {
    timeout = HandleLock.DEFAULT_LOCK_DURATION;
  }

  // Adjust the lock.
  this.lock.timeout = timeout;
  this.lock.expires = Date.now() + (timeout * 1000);

  this.cxt.log("Resetting lock to Second-%d (%s)", timeout, this.lock.expires, 'debug');

  var self = this;
  this.lockStore.set(this.resource.name(), this.lock, function (e) {
    if (e) {
      if (e.status) {
        self.reroute('@' + e.status, self.cxt);
        return;
      }
      self.reroute('@500', self.cxt);
    }

    self.done(this.lock.toXML());
  });
}

HandleLock.prototype.createLock = function () {

  // If it is not a resource, create an empty resource.
  //
}

HandleLock.prototype.lockToken = function () {
  var tokStr = this.req.headers['if'];
  if (tokStr) {
    return lutils.extractLockToken(tokStr);
  }
}

HandleLock.prototype.parseTimeout = function() {
  var tStr = this.req.header.timeout;
  var seconds = 0;
  if (!tStr) {
    return seconds;
  }
  var values = tStr.split(',');
  for (var i = 0; i < values.length; ++i) {
    var v = values[i].trim().toLowerCase();
    if (v == 'infinite') {
      seconds = -1;
    }
    else if (v.indexOf('second-') == 0) {
      seconds = parseInt(v.substring(6));
      break;
    }

  }
  return seconds;
}
