var pronto = require('pronto');
var Lock = require('../backend/lock');
// var LockUtils = require('../backend/lockutils');
var HTTPUtil = require('./util');
/**
 * Handle WebDAV LOCK requests.
 *
 * The LOCK method can do two thins. First, it can create a new lock.
 * This requires that the request have an XML body with a lock object.
 * Second, it can refresh a lock. Such a request has no XML body, but
 * has an If HTTP header.
 *
 * Params:
 * - baseURI: The path to the resource (REQUIRED)
 * - lockToken: The lock token (see CheckLock)
 * - resourceBridge: A resource bridge (REQUIRED).
 * - xml: The DOM for the XML body. (OPTIONAL)
 * - resource: The current resource. (OPTIONAL)
 * - lock: The Lock object. (OPTIONAL)
 * - parentLock: The parent lock object (OPTIONAL)
 *
 * @todo
 *  - There's a lot of stuff here (like default lock info) that may or
 *  may not belong at this level. On the one hand, we could expose it
 *  directly to the registry. On the other, we could push it down into
 *  Lock.
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
  cxt.log("Lock request received.", "debug");
  this.required(params, ['resourceBridge', 'baseURI']);

  this.lockStore = cxt.getDatasource('locks');
  this.req = cxt.getDatasource('request');
  this.bridge = params.resourceBridge;
  this.cxt = cxt;
  this.path = params.baseURI

  // The lock token. If present, we do a Refresh.
  this.token = params.lockToken; //this.lockToken();

  // XML from the client
  this.xml = params.xml;

  // An existing resource
  this.resource = params.resource;

  // An existing lock
  this.lock = params.lock;

  // The lock on a parent collection. Really, this should only be used
  // for indirect lock refreshing, which is a non-standard behavior
  // required by Litmus. (Non-standard in that the standard does not
  // address it at all.)
  this.parent = params.parentLock;

  this.httpStatus= 200;

  // Test conditional headers.
  /*
  var status = HTTPUtil.checkPreconditions(this.req, this.resource);
  if (status != 200) {
    cxt.log('Precondition failed: %s.', status, 'debug');
    this.reroute('@' + status, cxt);
    return;
  }
  */
  // Lock exists and is exclusive.
  if (this.cannotLock()) {
    cxt.log('Cannot lock a resource.', 'debug');
    this.reroute('@423', cxt);
    return;
  }
  // Refresh
  if (!this.xml && this.token) {
    cxt.log('Refresh lock for %s on %s.', this.token, this.path, 'debug');
    this.refreshLock();
    return;
  }
  // Create
  else if (this.xml) {
    cxt.log('Create a lock on %s.', this.path, 'debug');
    this.createLock();
    return;
  }
  // Malformed.
  else {
    cxt.log("Token: %s", this.token, 'debug');
    cxt.log('Malformed LOCK body.', 'warning');
    this.reroute('@400', cxt);
    return;
  }
}

HandleLock.prototype.setHeaders = function (lock) {
  this.cxt.add('httpHeaders', {
    'Content-Type': 'application/xml; charset="utf-8"',
    'Lock-Token': lock.headerToken()
  });
  this.cxt.add('httpStatus', this.httpStatus);
}

HandleLock.prototype.refreshLock = function () {

  if (!this.lock) {
    // If no lock, but there is a parent lock, do an "indirect refresh."
    if (this.parent) {
      this.lock = this.parent;
    }
    // Otherwise, 412 Precondition Failed (RFC 4918 9.10.6)
    else {
      // Cannot renew a lock when there is no lock.
      this.reroute('@412', this.cxt);
      return;
    }
  }

  this.setTimeout(this.lock, this.parseTimeout());

  this.cxt.log("Resetting lock to Second-%d (%s)", this.lock.timeout, this.lock.expires, 'debug');

  var self = this;
  this.lockStore.set(this.resource.name(), this.lock, function (e) {
    if (e) {
      if (e.status) {
        self.reroute('@' + e.status, self.cxt);
        return;
      }
      self.reroute('@500', self.cxt);
      return;
    }

    self.setHeaders(self.lock);
    self.done(self.lock.toXML());
  });
}

/**
 * Create a new lock.
 *
 * This may create a new empty resource, too.
 */
HandleLock.prototype.createLock = function () {
  var cmd = this;

  // If we have a resource, all we need to do is create a lock.
  if (this.resource) {
    this.buildLock();
    return;
  }

  // If it is not a resource, create an empty resource and then lock it.
  var StringReader = require('pronto/lib/streams').StringReader;
  var file = this.bridge.createFile(this.path);
  var empty = new StringReader('');
  this.resource = file;
  this.cxt.log("Creating empty lock resource", "debug");
  this.httpStatus = 201;
  this.bridge.save(file, empty, function (e) {
    if (e) {
      var stat = e.status || 500;
      cmd.reroute('@' + stat, cmd.cxt);
      return;
    }
    cmd.resource = file;
    cmd.buildLock();
    return;
  });
  return;
}

HandleLock.prototype.buildLock = function () {
  // Create a Lock object for this URI.
  var lock = Lock.fromXML(this.xml);
  lock.root = this.resource.name();
  lock.token = Lock.generateToken();
  this.setTimeout(lock, -1);

  var self = this;
  // Write the lock:
  this.lockStore.set(this.resource.name(), lock, function (e) {
    // Lock is not issued.
    if (e) {
      if (e.status) {
        self.reroute('@' + e.status, self.cxt);
        return;
      }
      self.reroute('@500', self.cxt);
      return;
    }
    // Put a Lock-Token: <> in the headers.
    self.setHeaders(lock);
    self.done(lock.toXML());
  });
}

/*
HandleLock.prototype.lockToken = function () {
  var tokStr = this.req.headers['if'];
  if (tokStr) {
    return LockUtils.extractLockToken(tokStr);
  }
}
*/

HandleLock.prototype.parseTimeout = function(timeout) {
  var tStr = timeout || this.req.headers.timeout;
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

HandleLock.prototype.setTimeout = function (lock, timeout) {
  // Get the timeout and adjust it.
  if (timeout < HandleLock.DEFAULT_MIN_LOCK_DURATION
      || timeout > HandleLock.DEFAULT_MAX_LOCK_DURATION) {
    timeout = HandleLock.DEFAULT_LOCK_DURATION;
  }

  // Adjust the lock.
  lock.timeout = timeout;
  lock.expires = Date.now() + (timeout * 1000);
}

/**
 * This checks to see if we can obtain a lock.
 *
 * If a resource is locked, and the lock is exclusive, then we cannot
 * take out a new lock.
 */
HandleLock.prototype.cannotLock = function () {
  if (!this.lock) {
    return false;
  }

  // Check to see if this lock is locked by another user.
  if (this.lock.isExclusive() && this.token != this.lock.token) {
    this.cxt.log('Exclusive lock owned by %s, I have token %s.', this.lock.token, this.token, 'debug');
    return true;
  }

  return false;
}
