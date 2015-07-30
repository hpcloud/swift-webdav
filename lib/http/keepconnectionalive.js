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
 * Keep an HTTP connection alive until we respond.
 *
 * This is used to keep the connection alive while we handle very large
 * uploads.
 */
function KeepConnectionAlive(){}
pronto.inheritsCommand(KeepConnectionAlive);
module.exports = KeepConnectionAlive;

KeepConnectionAlive.prototype.execute = function (cxt, params) {
  var sock = cxt.datasource('request').socket;
  // SSL cleartext streams do not have this.
  if (sock.setKeepAlive) {
    sock.setKeepAlive(true);
  }
  sock.setTimeout(0);

  this.done();
}
