var pronto = require('pronto');
/**
 * Delete a lock.
 *
 * This removes a lock silently. It is intended to augment DELETE verbs,
 * not to handle UNLOCK.
 */
function RemoveLock(){}
pronto.inheritsCommand(RemoveLock);
module.exports = RemoveLock;

RemoveLock.prototype.execute = function (cxt, params) {
  var lock = params.lock;
  var store = cxt.getDatasource('locks');
  if (!lock) {
    cxt.log('No lock found for deletion.', 'debug');
    this.done();
    return;
  }

  cxt.log("Removing lock on %s.", lock.root, 'debug');

  var cmd = this;
  store.remove(lock.root, lock, function () {
    cmd.done();
  });
}
