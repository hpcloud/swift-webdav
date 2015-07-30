/**
 * (c) Copyright 2015 Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
