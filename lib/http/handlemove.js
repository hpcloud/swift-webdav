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
var util = require('util');
var HTTPUtil = require('./util');
var URL = require('url');
var HandleCopy = require('./handlecopy');
/**
 * Handle HTTP MOVE.
 *
 * MOVEis defined in RFC 4918, 9.9.
 *
 * Params:
 * -resource: The resource to be copied. (REQUIRED)
 *
 */
function HandleMove() {
}
util.inherits(HandleMove, HandleCopy);
module.exports = HandleMove;

HandleMove.prototype.execute = function (cxt, params) {
  HandleCopy.prototype.execute.call(this, cxt, params);
}
HandleMove.prototype.doAction = function (resource, destination, overwrite) {
  var cmd = this;
  this.bridge.move(resource, destination, overwrite, function (e, multistatus) {
    if (e) {
      if (e.status) {
        cmd.cxt.log('Failed Move: %s %s', e.status, e.message, 'warning');
        cmd.reroute('@' + e.status, cmd.cxt);
      }
      else {
        cmd.cxt.log('Failed Move: %s', e.message, 'warning');
        cmd.reroute('@403', cmd.cxt);
      }
      return;
    }

    if (multistatus.length > 0) {
      cmd.cxt.log('MULTISTATUS: %j', multistatus, 'info');
      cmd.cxt.add('multistatus', cmd.toMultistatus(multistatus));
      cmd.done(207)
      return;
    }
    cmd.done(cmd.retval);

  });
}
