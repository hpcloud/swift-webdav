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
  if (parentLock && rname.length > 1) {
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

