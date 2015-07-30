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
