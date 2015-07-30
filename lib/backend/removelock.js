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
