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
var crypto = require('crypto');
var util = require('../http/util');

/**
 * This command clears the user auth cache (against memcache) for cached auth
 * information.
 *
 * Params:
 * - endpoint: URL to the IdentityServices endpoint. (REQUIRED)
 * - projectId: The project (tenant) ID. (OPTIONAL)
 */

function ClearUserAuthCache(){}
pronto.inheritsCommand(ClearUserAuthCache);
module.exports = ClearUserAuthCache;

ClearUserAuthCache.prototype.execute = function(cxt, params) {

	var memcached = cxt.getDatasource('memcached');
	var req = cxt.getDatasource('request');
	var endpoint = params.endpoint || '';

	var cmd = this;


  // If no authorization header, there's nothing to do.
	if (!req.headers.authorization) {
		this.done();
    return;
  }

  // Try to get the user.
  var user = util.userFromAuthString(req.headers.authorization);
  if (!user) {
    this.done();
    return
  }

  // Create the cache entry.
  var shasum = crypto.createHash('sha1');
  shasum.update(user.name + user.pass + endpoint + params.projectId);
  var cacheId = shasum.digest('hex');
  var mcstart = Date.now();

  // XXX: This is now done "in the background". There's no reason to wait to
  // respond to the user while we clear the cache, so we schedule this,
  // and then call carryOn() to keep moving.
  //
  // As a side note, there seems to be something funky with
  // memcached.get, where sometimes it cannot call done() reliably. I
  // don't know the issue.
  memcached.get(cacheId, function(err, result) {
    cxt.log("%d ms: ClearUserAuthCache Get(memcached)", Date.now() - mcstart, "custom");

    // If no result, bail.
    if (!result) {
      cxt.log("No cached token found.", "debug");
      return;
    }

    mcstart = Date.now();
    memcached.delete(cacheId, function(err, result) {
      cxt.log("%d ms: ClearUserAuthCache Delete(memcached)", Date.now() - mcstart, "custom");
      if (err) {
        // In case of an error we log it. Log all the things!
        var date = new Date().toUTCString();
        cxt.log("\033[1;35m[%s]\033[0m Error deleting %s from memcached. Message: %s", date, cacheId, err, "debug");
      }
      else {
        cxt.log("Removed cacheId: %s", cacheId, "debug");
      }
    });
  });
  this.keepCalmAnd().carryOn();
}
