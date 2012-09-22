/**
 * Resolve a route name based on HTTP method.
 */

module.exports = MethodBasedRequestResolver;

function MethodBasedRequestResolver() {
}

MethodBasedRequestResolver.prototype.init = function (registry) {
}

MethodBasedRequestResolver.prototype.resolve = function (path, context) {
  var req = context.getDatasource('request');
  if (path.indexOf('/') == 0 && req) {
    console.log('Resolving %s to %s', path, req.method);
    return req.method;
  }
  console.log('Resolving %s to %s', path, path);
  return path;
}
