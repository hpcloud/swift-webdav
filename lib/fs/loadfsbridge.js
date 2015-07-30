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
var FSBridge = require('./fsbridge');

/**
 * Params:
 * - root: The root filesystem path to be prepended to `path` to locate
 *   the directory on the file system. (OPTIONAL, default: '.')
 */
function LoadFSBridge() {
}
module.exports = LoadFSBridge;
pronto.inheritsCommand(LoadFSBridge);

LoadFSBridge.prototype.execute = function (cxt, params) {
  var root = params.root || '.';
  var baseURI = params.baseURI || '/';
  var req = cxt.getDatasource('request');

  var propStore = cxt.getDatasource('properties');
  if (!propStore) {
    cxt.log("Could not initialize datasource 'properties'", "fatal");
    this.error("Failed to load required datasource.");
  }

  var bridge = new FSBridge(root, baseURI, cxt, propStore);
  this.done(bridge);
}
