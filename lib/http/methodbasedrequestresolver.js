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
/**
 * Resolve a route name based on HTTP method.
 */

module.exports = MethodBasedRequestResolver;

function MethodBasedRequestResolver() {
}

MethodBasedRequestResolver.prototype.init = function (registry) {
}

/**
 * Resolve certain requests to HTTP verbs.
 *
 * Here is how this resolver resolves requests:
 *
 * - If the path starts with `/`, it is treated as a URI path, and the
 *   resolver attempts to return the HTTP verb from the request.
 * - If it cannot get the verb, it returns the path unaltered.
 * - If the path does NOT start with `/`, the path is returned
 *   unaltered.
 *
 * IMPORTANT: If you attempt to reroute one URI to another URI, make
 * sure you adjust the method if necessary. For example, rerouting
 * DELETE /foo to /bar will effecitvely resolve as DELETE /bar.
 */
MethodBasedRequestResolver.prototype.resolve = function (path, context) {
  var req = context.getDatasource('request');
  if (path.indexOf('/') == 0 && req) {
    // console.log('Resolving %s to %s', path, req.method);
    return req.method;
  }
  // console.log('Resolving %s to %s', path, path);
  return path;
}
