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
var URL = require('url');
var GetNormalizedPath = require('./getnormalizedpath');

/**
 * Validate a Destination header.
 */
function ValidateDestination() {}
pronto.inheritsCommand(ValidateDestination);
module.exports = ValidateDestination;

ValidateDestination.prototype.execute = function (cxt, params) {
  var req = cxt.getDatasource('request');
  var dest = params.destination || req.headers.destination;

  // Check that the Destination is correct.
  if(!dest) {
    // 25 years of my life and still
    // Trying to get up this great big hill
    //   Of hope
    // For a destination.
    cxt.add('body', 'No Destination');
    this.reroute('@409', cxt);
    return;
  }

  var destUrl = URL.parse(dest);
  var thisHost = req.parsedUrl.host || req.headers.host;
  if (thisHost && destUrl.host != thisHost) {
    cxt.log(req.parsedUrl, 'debug');
    cxt.log('Host is %s, expected %s.', destUrl.host, thisHost);
    this.reroute('@502', cxt);
    return;
  }

  // We try to test to make sure the paths are not the same. The spec
  // says this should produce a 403.
  var destPath = GetNormalizedPath.normalize(destUrl.pathname).replace(/\/$/,'');
  var srcPath = GetNormalizedPath.normalize(req.parsedUrl.pathname).replace(/\/$/,'');
  cxt.log('Source: %s, Dest: %s', srcPath, destPath, 'debug');
  if (destPath == srcPath) {
    cxt.log('Cannot copy a resource onto itself.', 'debug');
    cxt.add('body', 'Cannot copy a resource to itself.');
    this.reroute('@403', cxt);
    return;
  }

  this.done(destUrl.pathname);

}

