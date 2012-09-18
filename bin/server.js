/**
 * A simple WebDAV server.
 */

var pronto = require('pronto');
var webdav = require('../lib');
var registry = new pronto.Registry();
var router = new pronto.Router(registry);

router
  .group('bootstrap')
  .route('GET')
  .route('OPTIONS')
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



var server = pronto.HTTPServer.createSErver(registry, initialContext);
server.listen('8000', 'localhost')l
process.on('SIGINT', function () {server.close();});
