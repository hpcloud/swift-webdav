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
  var lock = params.lock;
  var req = cxt.datasource('request');

  var ifHeader = req.headers['if'];

  // No lock, nothing to do.
  if (!lock) {
    this.done();
    return;
  }

  var token;
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
  }

  // Locked by another, return 423.
  if (lock.token != token) {
    cxt.log("Locked with token %s, user supplied token %s.", lock.token, token, "debug");
    this.reroute('@423', cxt);
    return;
  }

  // Return the token.
  this.done(token);
}
