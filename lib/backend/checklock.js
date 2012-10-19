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

  // Not entirely sure what to do here. This indicates that a LOCK
  // exists, but that the current user has not sent a token. For shared
  // locks this should probably behave differently.
  if (!ifHeader) {
    this.reroute('@423', cxt);
    return;
  }

  var token = LockUtil.extractLockToken(ifHeader);

  // Locked by another, return 423.
  if (lock.token != token) {
    this.reroute('@423', cxt);
    return;
  }

  // Return the token.
  this.done(token);
}
