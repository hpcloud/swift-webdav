
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

  if (!token) {
    this.reroute('@400', cxt);
    return;
  }
  if (!lock) {
    this.reroute('@409', cxt);
  }

  this.removeLock();
}

HandleUnlock.prototype.removeLock = function (lock) {
  this.done(204);
  return;
}
