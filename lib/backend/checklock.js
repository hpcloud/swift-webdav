var pronto = require('pronto');
var LockUtil = require('./lockutils');
var IfRules = require('./ifrules');
/**
 * Check whether the resource is locked with a different token.
 *
 * If this file is locked by another token, this will issue a 423 LOCKED
 * response.
 *
 * If this file is not locked at all, it will return silently.
 *
 * Otherwise, it will return with the lock token.
 */
function CheckLock(){}
pronto.inheritsCommand(CheckLock);
module.exports = CheckLock;

CheckLock.prototype.execute = function (cxt, params) {
  cxt.log("Checking locks.", "debug");
  //var lock = params.lock;
  //var ancestor = params.parentLock;

  var resource = params.resource;
  var parent = params.parent;

  var req = cxt.datasource('request');

  var ifHeader = req.headers['if'];
  var token;

  this.cxt = cxt;

  // No lock, nothing to do.
  if (
    (!resource || !resource.hasLock())
      && (!parent || !parent.hasLock())
  ) {
    //console.log(resource);console.log(parent);
    if (ifHeader) {
      cxt.log("Looks like we have unlocked resources and an If header.", "debug");
      var resources = [];
      if (resource) {
        resources.push(resource);
      }
      if (parent) {
        resources.push(parent);
      }
      console.log(resources);
      this.evaluateLock(resources, ifHeader);
      return;
      //token = LockUtil.extractLockToken(ifHeader);
      /*
      cxt.log("Refresh request made on non-locked resource.", "debug");
      this.reroute('@412', cxt);
      return;
      */
    }
    cxt.log("No lock found. Not getting token. %s", this.name, "debug");
    this.done(token);
    return;
  }


  // UNLOCK requests should have lock-token set, but If can override.
  if (req.method == 'UNLOCK' && !ifHeader) {
    cxt.log("UNLOCK with a Lock-Token.", "debug");
    var lockToken = req.headers['lock-token'];
    if (!lockToken) {
      cxt.log("No lock-token supplied on a locked resource.", "debug");
      this.reroute('@400', cxt);
      return;
    }

    var tokenMatches = lockToken.match('<([^>]+)>');

    if (!tokenMatches && !tokenMatches[1]) {
      cxt.log("Invalid lock-token supplied on a locked resource.", "debug");
      this.reroute('@400', cxt);
      return;
    }

    // No resource to unlock.
    if (!resource) {
      this.reroute('@404', cxt);
      return;
    }

    // Check whether given token matches the resource's token:
    token = tokenMatches[1];
    var lock = resource.lock(0);
    if (!lock || lock.token != token) {
      cxt.log("Token %s is not in scope for the lock.", token, "debug");
      // Spec says to return 409 for missing lock.
      this.reroute('@409', cxt);
      return;
    }

    this.done(token);
  }
  // Not entirely sure what to do here. This indicates that a LOCK
  // exists, but that the current user has not sent a token. For shared
  // locks this should probably behave differently.
  else if (!ifHeader) {
    cxt.log("No IF-token supplied on a locked resource.", "debug");
    this.reroute('@423', cxt);
    return;
  }
  else {
    var resources = [];
    if (resource) {
      cxt.log("Testing resource %s", resource.name());
      resources.push(resource);
    }
    if (parent) {
      cxt.log("Testing parent %s", parent.name());
      resources.push(parent);
    }

    if (resources.length == 0) {
      // XXX: We shouldn't actually be able to get here.
      cxt.log("No resources to test.", "debug");
      this.done();
      return;
    }

    this.cxt.log(resources, "info");

    this.evaluateLock(resources, ifHeader);
    //token = LockUtil.extractLockToken(ifHeader);
    //cxt.log("TOKEN: %s", token);
  }
  return;
  /*

  // ==========================================================================
  // FIXME: Add support for shared locks here.
  // ==========================================================================

  // If we get to here, we start testing the actual locks.
  var lock = resource ? resource.lock(0) : null;
  var ancestor = parent ? parent.lock(0) : null;

  // Locked by another, return 423.
  if (lock && lock.token != token) {
    cxt.log("Locked with token %s, user supplied token %s.", lock.token, token, "debug");
    this.reroute('@423', cxt);
    return;
  }
  // The resource isn't locked, but the parent is.
  // ASSUMPTION: If S1 owns lock foo/bar, but S2 owns lock foo/ and foo/
  // is exclusive, S1 should get a 423.
  else if (ancestor && ancestor.token != token) {
    cxt.log("Parent locked with token %s, user supplied token %s.", lock.token, token, "debug");
    this.reroute('@423', cxt);
    return;
  }


  // Return the token.
  this.done(token);
  */
}

CheckLock.prototype.evaluateLock = function (resources, ifHeader) {
  var rules = new IfRules(ifHeader);
  var cmd = this;
  rules.evaluate(resources, function (e, token) {
    if (e) {
      if (!e.status) {
        cmd.cxt.log("Error evaluating ifHeader %s: %s", ifHeader, e.message, "warning");
        cmd.cxt.log(e.stack, "warning");
        cmd.reroute('@412', cmd.cxt);
        return;
      }
      cmd.reroute('@' + e.status, cmd.cxt);
      return;
    }

    // EXPERIMENTAL
    if (cmd.stillLocked(resources, token)) {
      cmd.cxt.log("Still locked.", "debug");
      cmd.reroute('@423', cmd.cxt);
      return;
    }

    cmd.done(token);
  });
}

CheckLock.prototype.stillLocked = function (resources, token) {
  for (var i = 0; i < resources.length; ++i) {
    var r = resources[i];
    var l = r.lock(0);

    if (l && l.token == token) {
      return false;
    }
  }
  return true;
}
