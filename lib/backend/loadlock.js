var pronto = require('pronto');
var path = require('path');
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
 * - lockStorage: A lock backend. If not found, this will try to use
 *   the 'locks' datasource. (OPTIONAL)
 * - parent: If this is set to something truthy, the command will try to fetch
 *   the lock on the parent collection, not the lock on the given
 *   resource.
 */
function LoadLock(){}
pronto.inheritsCommand(LoadLock);
module.exports = LoadLock;

LoadLock.prototype.execute = function (cxt, params) {
  var req = cxt.getDatasource('request');
  var resource = params.resource;
  var parentLock = params.parent || false;

  var lockStore = params.lockStorage || cxt.getDatasource('locks');

  if (!resource || !lockStore) {
    this.done();
    return;
  }

  var rname = resource.name();
  if (parentLock) {
    rname = path.dirname(rname) + '/';
    cxt.log("Looking for lock on parent %s of %s", rname, resource.name(), 'debug');
  }

  var cmd = this;
  lockStore.get(rname, function (e, lockObj) {
    if (e) {
      if (e.status) {
        cmd.reroute('@' + e.status, cxt);
      }
      else {
        cmd.reroute('@500', cxt);
      }
      return;
    }
    if (lockObj) {
      resource.setLocks([lockObj]);
      cxt.log("Loaded a lock for %s", lockObj.root, 'debug');
    }
    else {
      cxt.log("No lock found for URI %s", req.url, 'debug');
    }
    cmd.done(lockObj);
  });
}

