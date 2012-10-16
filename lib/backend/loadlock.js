var pronto = require('pronto');
/**
 * Load a lock for a given resource.
 *
 * This gets a lock for the given resource. If no lock is found, this
 * returns nothing. If a lock is found, the lock object is returned.
 *
 * Params:
 *
 * - resource: A resource. If none is found, this bails out early.
 *   (OPTIONAL)
 * - lockStorage: A lock backend. If not found, this will bail out
 *   early. (OPTIONAL)
 * - lockToken: The lock ID. If not found, this will attempt to fetch one
 *   from the HTTP Lock-Token or If headers (in that order).
 */
function LoadLock(){}
pronto.inheritsCommand(LoadLock);
module.exports = LoadLock;

LoadLock.prototype.execute = function (cxt, params) {
  var req = cxt.getDatasource('request');
  var resource = params.resource;
  var tok = params.lockToken || this.lockToken(req);

  var lockStore = params.lockStorage || cxt.getDatasource('locks');

  if (!resource || !lockStore) {
    this.done();
    return;
  }

  var cmd = this;
  lockStore.get(resource.name(), function (e, lockObj) {
    if (e) {
      if (e.status) {
        cmd.reroute('@' + e.status, cxt);
      }
      else {
        cmd.reroute('@500', cxt);
      }
      return;
    }

    cmd.done(lockObj);
  });
}

LoadLock.prototype.lockToken = function (request) {
  if (request.header['lock-token']) {
    return request.header['lock-token'];
  }
  else if (request.header['if']) {
    var tokenString = request.header['if'];

    // Find (<URI>). We don't enforce the URI structure. We just try to
    // match the middle part.
    var tokens = tokenString.match(/^\(\<([^\>]*)\>\)$/);
    if (tokens.length > 0) {
      return tokens[0];
    }
  }
}
