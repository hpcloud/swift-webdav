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

function BetaBlocker(){}
pronto.inheritsCommand(BetaBlocker);
module.exports = BetaBlocker;

BetaBlocker.prototype.execute = function (cxt, params) {
  this.required(params, ['identity']);
  var grant = params.grant;
  var identity = params.identity;
  var name = identity.user().name;

  cxt.log("Checking for beta user %s", name, "debug");

  // If there is no list, or if the user is on the list, let the user
  // pass.
  if (!grant || grant[name]) {
    cxt.log("Granted to %s.", name, "debug")
    this.done();
    return;
  }

  // 403: Permission denied.
  cxt.log("User %s is not on the GRANT list.", name, "info");
  this.reroute('@403', cxt);
}
