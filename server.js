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
  // Set up the logger
  .logger(pronto.logging.ConsoleLogger, {colors: true})
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
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:head')

  .route('DELETE')
    .includes('@bootstrap')
    .does(webdav.backend.LoadResource, 'resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:path')
    .does(webdav.http.HandleDelete, 'delete')
      .using('resourceBridge').from('cxt:bridge')
      .using('resource').from('cxt:resource')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:delete')

  .route('PUT')
    .does(pronto.commands.BufferRequest, 'input')
    .includes('@bootstrap')
    .does(webdav.backend.LoadResource, 'resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:path')
    .does(webdav.http.HandlePut, 'put')
      .using('resourceBridge').from('cxt:bridge')
      .using('path').from('cxt:path')
      .using('resource').from('cxt:resource')
      .using('readStream').from('cxt:input')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:put')

  .route('PROPFIND')
    .includes('@bootstrap')
    .does(webdav.xml.ParseXML, 'xml')
      // XXX: Currently, we're not buffering this.
      //.using('input').from('cxt:input')
    .does(webdav.http.HandlePropfind, 'propfind')
      .using('path').from('cxt:path')
      .using('resource').from('cxt:resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('xml').from('cxt:xml')
    .does(webdav.xml.SerializeXML, 'body')
      .using('xml').from('cxt:propfind')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 207).from('cxt:httpStatus')
      .using('body').from('cxt:body')

  // Since we support extended-mkcol, this can return
  // 201 or 207, with our without a body.
  .route('MKCOL')
    .includes('@bootstrap')
    .does(webdav.http.HandleMkcol, 'mkcol')
      .using('path').from('cxt:path')
      .using('resource').from('cxt:resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('xml').from('cxt:xml')
    .does(webdav.xml.SerializeXML, 'body')
      .using('xml').from('cxt:extendedMkcol')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 201).from('cxt:mkcol')
      .using('body').from('cxt:body')

  .route('PROPPATCH')
    .includes('@bootstrap')
  .route('COPY')
    .includes('@bootstrap')
  .route('MOVE')
    .includes('@bootstrap')
  .route('REPORT')
    .includes('@bootstrap')
    .does(webdav.http.HandleReport, 'report')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:report')

  // ================================================================
  // Error Routes
  // ================================================================
  .route('@304')
    // 304 should never have a body. It is up to the app to put
    // one of Date, ETag, Expires, Vary, and so on.
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 304)

  .route('@403')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Forbidden')
      .using('2', 'Forbidden')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 403)
      .using('body').from('cxt:body')

  .route('@404')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Not Found')
      .using('2', 'Not Found')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 404)
      .using('body').from('cxt:body')

  .route('@405')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Method Not Allowed')
      .using('2', 'Method Not Allowed').from('cxt:body')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 405)
      .using('body').from('cxt:body')
  .route('@409')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Conflict')
      .using('2', 'Conflict').from('cxt:body')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 409)
      .using('body').from('cxt:body')

  .route('@412')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Precondition Failed')
      .using('2', 'Precondition Failed').from('cxt:body')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 412)
      .using('body').from('cxt:body')

  .route('@415')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Unsupported Media Type')
      .using('2', 'Unsupported Media Type').from('cxt:body')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 415)
      .using('body').from('cxt:body')

  .route('@500')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Internal Server Error')
      .using('2', 'Internal Server Error').from('cxt:httpError')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 500)
      .using('body').from('cxt:body')

  .route('@501')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Not Implemented')
      .using('2', 'Not Implemented').from('cxt:httpError')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 501)
      .using('body').from('cxt:body')

  .route('@507')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Insufficient Storage')
      .using('2', 'Insufficient Storage').from('cxt:httpError')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 507)
      .using('body').from('cxt:body')
;

// TODO: Need top-level error handling.
var resolver = new webdav.http.MethodBasedRequestResolver()
var server = pronto.HTTPServer.createServer(register, initialContext);
server.setResolver(resolver);
server.listen(8000, 'localhost');
process.on('SIGINT', function () {server.close();});
