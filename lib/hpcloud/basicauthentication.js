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
var BasicBasicAuth = require('../http/basicauthentication');
var hpcloud = require('hpcloud-js');
var crypto = require('crypto');

/**
 * Basic authentication against IdentityServices.
 *
 * Params:
 * - endpoint: URL to the IdentityServices endpoint. (REQUIRED)
 * - projectId: The project (tenant) ID. (OPTIONAL)
 * - realm: The realm name. (OPTIONAL)
 * - cache: The location of memcache to use when storing auth tokens. (OPTIONAL)
 */
function BasicAuthentication(){}
util.inherits(BasicAuthentication, BasicBasicAuth);
module.exports = BasicAuthentication;

// Override
BasicAuthentication.prototype.execute = function(cxt, params) {
  var cmd = this;

  var realm = this.realm = params.realm || 'WebDAV';
  var req = cxt.getDatasource('request');

  this.tenantId = params.projectId;
  this.endpoint = params.endpoint || '';

  this.is = new hpcloud.IdentityServices(this.endpoint);
  this.is.setTenantId(this.tenantId);

  this.handleAuthentication(req, realm, cxt);
}

// Override
BasicAuthentication.prototype.authenticate = function (user, realm, cxt) {
  var cmd = this;
  var memcached = cxt.getDatasource('memcached');

  if (memcached) {
    // See if we already have identity details. We are caching the identity
    // data property so we can use it to constuct a new identity object.
    var shasum = crypto.createHash('sha1');
    shasum.update(user.name + user.pass + this.endpoint + this.tenantId);
    var cacheId = shasum.digest('hex');

    var mcstart = Date.now();
    memcached.get(cacheId, function(err, result) {
      cxt.log("%d ms: BasicAuthentication.authenticate(memcached)", Date.now() - mcstart, "custom");
      if (err) {
        // In case of an error we log it. Log all the things!
        var date = new Date().toUTCString();
        cxt.log("\033[1;35m[%s]\033[0m Error retrieving %s from memcached. Message: %s", date, cacheId, err, "debug");
      }

      if (result) {
        var identity = new hpcloud.Identity(result);
        //cxt.log("Identity (from memcached): %j", identity, 'debug');
        cmd.done(identity);
      }
      else {
        // Nothing in the cache so we need to get the identity and store it
        var isstart = Date.now();
        cmd.doAuthentication(user.name, user.pass, cxt, function(identity) {
          cxt.log("%d ms: BasicAuthentication.authenticate(IdentityServices)", Date.now() - isstart, "custom");
          var data = identity.data;
          var expires = new Date(data.access.token.expires);
          var now = new Date();

          // Cache the token for half of it's expires life. The times we have are
          // in ms so we first convert this to seconds.
          // var expireIn = Math.ceil((expires.getTime() - now.getTime()) / 1000) / 2;
          var expireIn = Math.floor(Math.ceil((expires.getTime() - now.getTime()) / 1000) / 2);

          // We store the value in async so it doesn't hold up the execution.
          // We only cache if the expires is greater than 5 minutes from now.
          // @todo tweak time around caching.
          if (!err && expireIn > 300) {
            memcached.set(cacheId, data, expireIn, function(err, result) {
              if (err) {
                // In case of an error we log it. Log all the things!
                var date = new Date().toUTCString();
                cxt.log("\033[1;35m[%s]\033[0m Error storing %s in memcached. Message: %s", date, cacheId, err, "debug");
              }

              cxt.log("Storing %s in memcached.", cacheId, 'debug');
            });
          }

          cmd.done(identity);
        });
      }


    });
  }
  else {
    // If memcached is not avaialable go directly though IS.
    this.doAuthentication(user.name, user.pass, cxt, function(identity) {
      //cxt.log("Identity (skipping memcached): %j", identity, 'debug');
      cmd.done(identity);
    });
  }
}

/**
 * Handle the authentication from a remove service.
 *
 * @param {string} name
 *   A username
 * @param {string} pass
 *   A password associated with the username.
 * @param {Object} cxt
 *   The execution context
 * @param {function} fn
 *   A callback function to call when authention is complete.
 */
BasicAuthentication.prototype.doAuthentication = function (name, pass, cxt, fn) {
  var cmd = this;

  cxt.log("Identity services auth: doAuthentication", "custom");
  this.is.authenticateAsUser(name, pass, function (e, data) {
    if (e) {
      cxt.log("Failed HPCloud BasicAuth: %s", e.message, 'debug');
      cmd.handleUnauthorized(cxt, this.realm);
      return;
    }
    cxt.log("Identity (fetched from IS): %j", data, 'debug');

    fn(data);
  });
}
