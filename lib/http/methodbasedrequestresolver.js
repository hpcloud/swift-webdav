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
