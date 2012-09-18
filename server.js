/**
 * A simple WebDAV server.
 */

var pronto = require('pronto');
var webdav = require('./lib');
var register = new pronto.Registry();
var initialContext = new pronto.Context();

register
  .route('@bootstrap')
  .route('GET')
  .route('OPTIONS')
    .includes('@bootstrap')
    .does(webdav.http.HandleOptions, 'options')
    .does(pronto.commands.HTTPResponse)
      .using('headers').from('cxt:options')
      .using('code', 200)
  .route('HEAD')
  .route('DELETE')
  .route('PROPFIND')
  .route('MKCOL')
  .route('PUT')
  .route('PROPPATCH')
  .route('COPY')
  .route('MOVE')
  .route('REPORT')
;

// TODO: Need top-level error handling.

var server = pronto.HTTPServer.createServer(register, initialContext);
server.setResolver(new webdav.MethodBasedRequestResolver());
server.listen(8000, 'localhost');
process.on('SIGINT', function () {server.close();});
