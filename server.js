/**
 * A simple WebDAV server.
 */

var pronto = require('pronto');
var webdav = require('./lib');
var fsdav = require('./lib/fs');

var register = new pronto.Registry();
var initialContext = new pronto.Context({
  baseURI: '/test'
});

register
  // Operations common across the board.
  .route('@bootstrap')
    .does(webdav.http.GetNormalizedPath, 'path')
      .using('baseURI').from('cxt:baseURI')
    .does(fsdav.LoadFSBridge, 'bridge')
      .using('root', './data')
  // ================================================================
  // HTTP Operations.
  // ================================================================
  .route('OPTIONS')
    .includes('@bootstrap')
    .does(webdav.backend.LoadResource, 'resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:path')
    .does(webdav.http.HandleOptions, 'options')
      .using('resource').from('cxt:resource')
    .does(pronto.commands.HTTPResponse)
      .using('headers').from('cxt:options')
      .using('code', 200)
  .route('GET')
    .includes('@bootstrap')
    .does(webdav.backend.LoadResource, 'resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:path')
      .using('addDatasource', true) // It's magic!
    .does(webdav.http.HandleGet, 'get')
      .using('resource').from('cxt:resource')
    .does(webdav.http.StreamedHTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:get')
      .using('stream').from('resource:stream')
  .route('HEAD')
    .includes('@bootstrap')
    .does(webdav.backend.LoadResource, 'resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:path')
    .does(webdav.http.HandleHead, 'head')
      .using('resource').from('cxt:resource')
    //.does(pronto.commands.HTTPResponse)
    .does(webdav.http.StreamedHTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:head')
  .route('DELETE')
    .includes('@bootstrap')
  .route('PROPFIND')
    .includes('@bootstrap')
  .route('MKCOL')
    .includes('@bootstrap')
  .route('PUT')
    .includes('@bootstrap')
  .route('PROPPATCH')
    .includes('@bootstrap')
  .route('COPY')
    .includes('@bootstrap')
  .route('MOVE')
    .includes('@bootstrap')
  .route('REPORT')
    .includes('@bootstrap')
;

// TODO: Need top-level error handling.
var resolver = new webdav.http.MethodBasedRequestResolver()
var server = pronto.HTTPServer.createServer(register, initialContext);
server.setResolver(resolver);
server.listen(8000, 'localhost');
process.on('SIGINT', function () {server.close();});
