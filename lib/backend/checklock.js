var pronto = require('pronto');
var LockUtil = require('./lockutils');
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
  //var lock = params.lock;
  //var ancestor = params.parentLock;

  var resource = params.resource;
  var parent = params.parent;

  var req = cxt.datasource('request');

  var ifHeader = req.headers['if'];
  var token;

  // No lock, nothing to do.
  if (
    (!resource || !resource.hasLock())
      && (!parent || !parent.hasLock())
  ) {
    console.log(resource);console.log(parent);
    /*
    if (ifHeader) {
      //token = LockUtil.extractLockToken(ifHeader);
      cxt.log("Refresh request made on non-locked resource.", "debug");
      this.reroute('@412', cxt);
      return;
    }
   */
    cxt.log("No lock found. Not getting token. %s", this.name, "debug");
    this.done(token);
    return;
  }

  // UNLOCK requests should have lock-token set, but If can override.
  if (req.method == 'UNLOCK' && !ifHeader) {
    var lockToken = req.headers['lock-token'];
    if (!lockToken) {
      cxt.log("No lock-token supplied on a locked resource.", "debug");
      this.reroute('@423', cxt);
      return;
    }

    var tokenMatches = lockToken.match('<([^>]+)>');

    if (!tokenMatches && !tokenMatches[1]) {
      cxt.log("Invalid lock-token supplied on a locked resource.", "debug");
      this.reroute('@423', cxt);
      return;
    }
    token = tokenMatches[1];
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
    token = LockUtil.extractLockToken(ifHeader);
    cxt.log("TOKEN: %s", token);
  }

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
}

