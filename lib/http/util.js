/**
 * Utilities for HTTP.
 */
Util = {};
module.exports = Util;

/**
 * Validate that the client's preconditions are satisfied.
 *
 * The HTTP 1.1 spec details several preconditions that a client may
 * request be satisfied before any operation is performed on the server.
 * This returns the appropriate HTTP code for various IF-* headers.
 *
 * @param {HTTPServerRequest} request
 *   The request.
 * @param {webdav.Resource} resource
 *   The resource. This may be undefined.
 *
 * @return {int}
 *   - 200 for success (no headers stop this from going on as normal)
 *   - 412 for Precondition Failed
 *   - 304 for Not Modified (GET/HEAD only)
 *
 *   Note that 200 just means "Go ahead", and it may not be the best
 *   response code for the app to return.
 */
Util.checkPreconditions = function (request, resource) {
  var headers = request.headers;
  var resExists = !!resource;
  var etag = resExists && !resource.isCollection ? resource.etag() : '';
  var modTime = resExists ? resource.lastModified() : Date.now();
  var getOrHead = request.method == 'GET' || request.method == 'HEAD';

  if (headers['if-match']) {
    var matchTags = headers['if-match'].split(',');

    // If * or match, serve the resource. While the spec
    // indicates that * must be on its own, we allow for badly
    // behaved HTTP clients.
    var matches = false;
    for (var i = 0; i < matchTags.length; ++i) {
      // If * AND the resource exists, return this doesn't match
      if (matchTags[i] == '*' && resExists) {
        matches = true;
        break;
      }
      else if (etag == matchTags[i].trim()) {
        matches = true;
        break;
      }
    }
    // If no 412 rules matched, we have an error.
    if (!matches) {
        return 412; // Precondition Failed.
    }
  }

  if (headers['if-none-match']) {
    var noneMatch = headers['if-none-match'].split(',');

    for (var i = 0; i < noneMatch.length; ++i) {
      var nm = noneMatch[i].trim();
      if (resExists && (nm == etag || nm == '*')) {
        return getOrHead ? 304 : 412; // Not modified or Precondition Failed
      }
    }
  }
  // RFC-2616, 14.26
  // "If none of the entity tags match, then the server MAY perform the
  // requested method as if the If-None-Match header field did not
  // exist, but MUST also ignore any If-Modified-Since header field(s)
  // in the request."
  else if (headers['if-modified-since']) {
    var lastTime = Date.parse(headers['if-modified-since']);

    // For GET or HEAD requests, if the file has not been modified, we
    // return a 304. (Actually, RFC 2616 does not limit to just
    // GET/HEAD)
    if (/*getOrHead &&*/ lastTime > modTime) {
      // Should we test to see if header[Range] is set? And if so, what
      // should we do? See 14.25.
      return 304;
    }
  }
  // According to the HTTP spec,
  // if this and if-mod-since are both set, behavior is undefined. So we
  // just skip the second one.
  else if (headers['if-unmodified-since']) {
    var lastTime = Date.parse(headers['if-unmodified-since']);

    // IT'S A TRAP!
    if (resExists && lastTime < modTime) {
      return 412;
    }
  }

  return 200;
}