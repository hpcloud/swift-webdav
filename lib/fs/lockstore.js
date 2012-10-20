/**
 * Very simple lock storage.
 *
 * This is in-memory lock storage. It is HIGHLY VOLATILE and will not
 * persist across application restarts.
 *
 * It does illustrate the lock API, though, and can be extended.
 */
function LockStore(){
  this.cache = {};
};
module.exports = LockStore;

LockStore.prototype.set = function (uri, object, fn) {
  console.log("Setting %s with lock %s", uri, object.token);
  this.cache[uri] = object;
  fn();
}

LockStore.prototype.get = function (uri, fn) {
  console.log(this.cache);
  fn(false, this.cache[uri]);
}

LockStore.prototype.remove= function (uri, object, fn) {
  delete this.cache[uri];
  fn();
}
