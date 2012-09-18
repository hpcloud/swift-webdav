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
  console.log('Resolving %s to %s', path, req.method);
  if (req) {
    return req.method;
  }
}
