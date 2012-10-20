
var pronto = require('pronto');
/**
 * Handle WebDAV UNLOCK requests.
 */
function HandleUnlock() {}
pronto.inheritsCommand(HandleUnlock);
module.exports = HandleUnlock;

HandleUnlock.prototype.execute = function (cxt, params) {
  var lock = params.lock;
  var req = cxt.getDatasource('request');
  var token = req.headers['lock-token'];
  this.lockStore = cxt.getDatasource('locks');
  this.cxt = cxt;

  if (!token) {
    cxt.log("Client attempted to unlock without a token.", "warning");
    this.reroute('@400', cxt);
    return;
  }
  if (!lock) {
    cxt.log("UNLOCK called on already unlocked resource.", "debug");
    this.reroute('@409', cxt);
    return;
  }

  this.removeLock(lock);
}

HandleUnlock.prototype.removeLock = function (lock) {
  var cmd = this;
  console.log(lock);
  this.lockStore.remove(lock.root, lock, function (e) {
    if (e) {
      cmd.cxt.log(e, 'debug');
    }
    cmd.done(204);
  });
}
