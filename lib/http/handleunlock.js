
var pronto = require('pronto');
/**
 * Handle WebDAV UNLOCK requests.
 */
function HandleUnlock() {}
pronto.inheritsCommand(HandleUnlock);
module.exports = HandleUnlock;

HandleUnlock.prototype.execute = function (cxt, params) {
  this.required(params, ['resourceBridge']);
  var req = cxt.getDatasource('request');
  var token = req.headers['lock-token'];
  var resource = params.resource;
  this.bridge = params.resourceBridge;
  this.cxt = cxt;

  if (!resource) {
    cxt.log("Client attempted to unlock nonexistant resource.", "info");
    this.reroute('@404', cxt);
    return;
  }
  if (!token) {
    cxt.log("Client attempted to unlock without a token.", "warning");
    this.reroute('@400', cxt);
    return;
  }

  var lock = resource.lock(0);
  if (!lock) {
    cxt.log("UNLOCK called on already unlocked resource.", "debug");
    this.reroute('@409', cxt);
    return;
  }

  this.removeLock(resource, lock);
}

HandleUnlock.prototype.removeLock = function (resource, lock) {
  var cmd = this;
  this.cxt.log("Unlocking %j", lock, "warning");
  this.bridge.unlock(resource, lock, function (e) {
  //this.lockStore.remove(lock.root, lock, function (e) {
    if (e) {
      cmd.cxt.log(e, 'debug');
    }
    cmd.done(204);
  });
}
