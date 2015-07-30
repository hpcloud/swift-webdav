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
var HTTPUtil = require('./util');
/**
 * Handle HTTP MKCOL requests.
 *
 * MKCOL is a WebDAV verb for creating collections.
 * See RFC 4918, section 9.3
 *
 * Params:
 *
 * - path: Path to the new collection (REQUIRED)
 * - resourceBridge: The resource bridge (REQUIRED)
 * - resource: The existing Resource, if there is one (OPTIONAL)
 * - xml: The DOM of the XML body, if there is one (OPTIONAL)
 */
function HandleMkcol() {
}
pronto.inheritsCommand(HandleMkcol);
module.exports = HandleMkcol;

HandleMkcol.prototype.execute = function (cxt, params) {
  this.required(params, ['path']);
  var path = params.path;
  var resource = params.resource;
  var xml = params.xml;
  this.bridge = params.resourceBridge
  this.cxt = cxt;

  var request = cxt.getDatasource('request');

  // XXX: Should this get moved after the extended mkcol?
  if (path == '/') {
    cxt.log(resource, "info");
    cxt.log("The resource already exists.", "debug");
    cxt.add('body', 'The resource already exists.');
    this.reroute('@405', cxt);
    return;
  }
  else if (resource) {
    console.log(resource);
    if (resource.isRoot) {
      cxt.log("Root cannot be modified.", "debug");
      cxt.add('body', 'Root directory cannot be modifed.');
      this.reroute('@403', cxt);
      return;
    }
    // A mkcol can be called where a subdir is.
    else if (!resource.isSubdir) {
      cxt.log("The resource already exists.", "debug");
      cxt.add('body', 'The resource already exists.');
      this.reroute('@405', cxt);
      return;
    }
    else {
      cxt.log("Cannot mkcol on an existing resource.");
      cxt.add('body', 'URI is already mapped.');
      this.reroute('@405', cxt);
      return;

    }
  }

  // We can do an extended mkcol.
  if (typeof xml == 'object') {
    this.doExtendedMkcol(xml);
    return;
  }
  // The standard requires this behavior, but doesn't explain whether
  // the factor to be weighed is the presence of a Content-Type or the
  // presence of a body (or both).
  // else if (resource.headers['content-length'] 
  //         && parseInt(resource.headers['content-length']) > 0) {
  else if (request.headers['content-type']) {
    // Uh... what kind of body would this be? ABORT!
    cxt.add('body', 'Message body could not be interpreted.');
    this.reroute('@415', cxt);
    return;
  }

  // Vanilla mkcol
  var col = this.bridge.createCollection(path);
  this.doMkcol(col);
  return;
}

/**
 * Basic mkcol.
 */
HandleMkcol.prototype.doMkcol = function (collection) {
  var cmd = this;
  this.bridge.mkcol(collection, function (e) {
    if (e) {
      // Valid statuses are: 403, 405, 409, 415, 500
      var status = e.status || 500;
      cmd.cxt.log("Failed mkcol with " + status + ": " + e.message, 'warning');
      cmd.reroute('@' + status, cmd.cxt);
      return;
    }
    cmd.done(201);
  });
}
/**
 * Extended mkcol.
 */
HandleMkcol.prototype.doExtendedMkcol = function (xml) {
  this.reroute('@415', this.cxt);
  return;

  // This needs to put the XML DOM into extendedMkcol:
  var multistatus = '';
  this.cxt.add('extendedMkcol', multistatus);

}
