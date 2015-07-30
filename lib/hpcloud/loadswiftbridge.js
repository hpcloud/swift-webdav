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
var SwiftBridge = require('./swiftbridge');
/**
 * Load the swift bridge.
 *
 * Params:
 * -identity
 * -region
 * -endpoint
 * -container (OPTIONAL)
 * -baseURI (OPTIONAL)
 */
function LoadSwiftBridge(){}
pronto.inheritsCommand(LoadSwiftBridge);
module.exports = LoadSwiftBridge;

LoadSwiftBridge.prototype.execute = function (cxt, params) {
  this.required(params, ['identity', 'region', 'endpoint']);

  var req = cxt.datasource('request');
  var identity = params.identity;
  var endpoint = params.endpoint;
  var region = params.region;
  var container = params.container || '';
  var baseURI = params.baseURI || this.buildBaseURI(identity, container);

  var bridge = new SwiftBridge(identity, endpoint, baseURI, region, container);
  bridge.setContext(cxt);

  this.done(bridge);
}


LoadSwiftBridge.prototype.buildBaseURI = function (identity, container) {
  var tid = identity.tenantId();
  if (!tid) {
    return '/';
  }

  var url = "/" + tid + "/";
  if (container && container.length > 0) {
    url += container + "/";
  }
  return url;
}
