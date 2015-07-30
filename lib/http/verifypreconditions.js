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
var HTTPUtils = require('./util');

/**
 * Verify HTTP preconditions.
 */
function VerifyPreconditions(){}
pronto.inheritsCommand(VerifyPreconditions);
module.exports = VerifyPreconditions;

VerifyPreconditions.prototype.execute = function (cxt, params) {
  var request = cxt.getDatasource('request');
  var resource = params.resource;

  var status = HTTPUtils.checkPreconditions(request, resource);

  if (status != 200) {
    cxt.log("Preconditions failed for %s: %s", request.url, status, 'debug');
    this.reroute('@' + status, cxt);
    return;
  }

  this.done();
}
