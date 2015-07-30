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
 * Get the tenant ID.
 *
 * If present, this also gets the container name, which it puts into the
 * context as containerName (unless otherwise specified).
 *
 * Params:
 * - path: The path to parse. If none supplied, this will use the
 *   request path. (OPTIONAL)
 * - containerKey: This will also try to parse out the container name,
 *   which it will store in the context as 'containerName' UNLESS you
 *   set this value. In that case, the value of 'containerKey' will be
 *   used as the key in the context. (OPTIONAL)
 *
 * Regarding the 'containerKey' param, uses('containerKey', 'foo') will
 * result in cxt.add('foo', 'someContainerName').
 */
function GetProjectId(){}
pronto.inheritsCommand(GetProjectId);
module.exports = GetProjectId;

GetProjectId.prototype.execute = function (cxt, params) {
  var req = cxt.datasource('request');
  var url = params.path || req.parsedUrl.pathname;
  var cnameLabel = params.containerKey|| 'containerName';

  //cxt.log("Looking for Project ID in %s.", url, 'debug');

  var parts = url.split('/');
  if (parts.length < 2) {
    cxt.done();
    return;
  }

  // Check for a Project ID (aka Tenant ID)
  var tenantId = parts[1];
  if (tenantId.match(/^\d+$/)) {

    // Check for a container name.
    if (parts.length > 2) {
      var container = parts[2];
      cxt.add(cnameLabel, container);
    }

    cxt.log("Tenant: %s, Container: %s", tenantId, container, "debug");
    this.done(tenantId);
    return;
  }
  return this.done();
}
