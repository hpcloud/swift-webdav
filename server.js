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
 * A simple WebDAV server.
 */
var fs = require('fs');
var Path = require('path');
var pronto = require('pronto');
var webdav = require('./lib');
var fsdav = require('./lib/fs');
var register = new pronto.Registry();
var Syslogger = require('./lib/backend/syslogger');

// For blocking users who aren't in the beta.
var BetaBlocker = require('./lib/hpcloud/betablocker');

// Source code base directory.
var here = Path.dirname(process.argv[1]);

// Load the settings.
var settingsFile = process.argv[2] || './settings.json';
var settings = webdav.backend.LoadConfig.loadFileSync(settingsFile);

// Initial context is the settings.
var initialContext = new pronto.Context(settings);

// Setup SSL if enabled.
if (settings.http.ssl === true) {
  initialContext.add('ssl', true);
  var key = Path.resolve(here, settings.http.options.sslKey);
  var cert = Path.resolve(here, settings.http.options.sslCertificate);
  initialContext.add('sslKey', fs.readFileSync(key));
  initialContext.add('sslCertificate', fs.readFileSync(cert));
}

register
  // Set up the logger
  //.logger(pronto.logging.ConsoleLogger, {colors: true, facilities: settings.log})
  .logger(Syslogger, {priorities: settings.log, facility: "local4"})
  .route('@serverStartup')
    .does(webdav.cache.setupMemcached, 'authcache')
      .using('settings').from('cxt:memcachedSettings')
      // name here adds the cache as a datasouce with that name.
      .using('name', 'memcached')
  .route('@serverShutdown')
  // ================================================================
  // Operation groups
  // ================================================================
  .route('@bootstrap')
    .does(webdav.backend.LogAccess, 'accesslog')
    .does(webdav.hpcloud.GetProjectId, 'projectid')
    .does(webdav.http.GetNormalizedPath, 'path')
      .using('baseURI').from('cxt:baseURI')
    .does(webdav.hpcloud.BasicAuthentication, 'identity')
      .using('endpoint').from('cxt:identityService')
      .using('realm', 'HPCloud')
      .using('projectId').from('cxt:projectid')
      .using('cache').from('cxt:authcache')
    .does(BetaBlocker, 'block')
      .using('grant').from('cxt:betaUsers')
      .using('identity').from('cxt:identity')
    .does(webdav.hpcloud.LoadSwiftBridge, 'bridge')
      .using('endpoint').from('cxt:identityService')
      .using('identity').from('cxt:identity')
      .using('region').from('cxt:region')
      .using('container').from('cxt:containerName')
    /*.does(fsdav.LoadFSBridge, 'bridge')
      .using('root', './data')
      .using('baseURI').from('cxt:baseURI')*/

  // READ operations should all have this.
  .route('@read')
    .does(webdav.backend.LoadResource, 'resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:path')
      .using('skipBody', false).from('cxt:skipBody')

  // WRITE operations should all have this.
  .route('@write')
    .does(webdav.backend.LoadResource, 'resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:path')
      .using('skipBody', false).from('cxt:skipBody')
    .does(webdav.backend.ParentName, 'parentPath')
      .using('path').from('cxt:path')
    .does(webdav.backend.LoadResource, 'parentResource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:parentPath')
      .using('skipBody', false).from('cxt:parentSkipBody')
  // ================================================================
  // HTTP Operations.
  // ================================================================
  .route('OPTIONS')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
    .includes('@bootstrap')
    .includes('@read')
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
    .does(pronto.commands.AddToContext, 'atc').using('skipBody', true)
    .includes('@bootstrap')
    .includes('@read')
    .does(webdav.http.HandleHead, 'head')
      .using('resource').from('cxt:resource')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:head')

  .route('DELETE')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
      .using('parentSkipBody', true)
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.backend.CheckLock, 'locktoken')
      .using('resource').from('cxt:resource')
      .using('parent').from('cxt:parentResource')
    .does(webdav.http.HandleDelete, 'delete')
      .using('resourceBridge').from('cxt:bridge')
      .using('resource').from('cxt:resource')
    //.does(webdav.backend.RemoveLock, 'removelock')
    //  .using('lock').from('cxt:lock')
    .does(webdav.xml.SerializeXML, 'body')
      .using('xml').from('cxt:multistatus')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:delete')
      .using('body', '').from('cxt:body')

  .route('PUT')
    .does(pronto.commands.BufferRequest, 'input')
    .does(webdav.http.KeepConnectionAlive, 'keepalive')
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.backend.CheckLock, 'locktoken')
      .using('resource').from('cxt:resource')
      .using('parent').from('cxt:parentResource')
    .does(webdav.http.HandlePut, 'put')
      .using('resourceBridge').from('cxt:bridge')
      .using('path').from('cxt:path')
      .using('resource').from('cxt:resource')
      .using('readStream').from('cxt:input')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 404).from('cxt:put')

  .route('PROPFIND')
    .does(pronto.commands.AddToContext, 'atc').using('skipBody', true)
    .does(webdav.http.PropfindMacHack, 'pmh')
      .using('path').from('cxt:path')
    .does(webdav.xml.ParseXML, 'xml')
    .includes('@bootstrap')
      // XXX: Currently, we're not buffering this.
      //.using('input').from('cxt:input')
    .includes('@read')
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

  .route('PROPPATCH')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
      .using('parentSkipBody', true)
    .does(webdav.xml.ParseXML, 'xml')
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.backend.CheckLock, 'locktoken')
      .using('resource').from('cxt:resource')
      // The spec does not call for this, but Litmus marks it an an error
      // condition when a parent lock does not restrict a PROPPATCH.
      // cf. RFC 4918 7.4.
      .using('parent').from('cxt:parentResource')
    .does(webdav.http.HandleProppatch, 'proppatch')
      .using('path').from('cxt:path')
      .using('resource').from('cxt:resource')
      .using('resourceBridge').from('cxt:bridge')
      .using('xml').from('cxt:xml')
    .does(webdav.xml.SerializeXML, 'body')
      .using('xml').from('cxt:proppatch')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 207).from('cxt:httpStatus')
      .using('body').from('cxt:body')

  // Since we support extended-mkcol, this can return
  // 201 or 207, with our without a body.
  .route('MKCOL')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
      .using('parentSkipBody', true)
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.xml.ParseXML, 'xml')
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

  .route('COPY')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
      .using('parentSkipBody', true)
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.http.ValidateDestination, 'dest')
    .does(webdav.http.GetNormalizedPath, 'destination')
      .using('path').from('cxt:dest')
      .using('baseURI').from('cxt:baseURI')
    .does(webdav.backend.LoadResource, 'targetResource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:destination')
      .using('skipBody', true)
    .does(webdav.backend.ParentName, 'targetParentPath')
      .using('path').from('cxt:destination')
    .does(webdav.backend.LoadResource, 'targetParentResource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:targetParentPath')
      .using('skipBody', true)
    // It is okay to copy a locked resource to an unlocked dest.
    //.does(webdav.backend.CheckLock, 'lockToken')
    //  .using('lock').from('cxt:lock')
    .does(webdav.backend.CheckLock, 'destlocktoken') // Check the destination
      .using('resource').from('cxt:targetResource')
      .using('parent').from('cxt:targetParentResource')
    .does(webdav.http.HandleCopy, 'copy')
      .using('resourceBridge').from('cxt:bridge')
      .using('resource').from('cxt:resource')
      .using('targetResource').from('cxt:targetResource')
      .using('destination').from('cxt:destination')
    .does(webdav.xml.SerializeXML, 'body')
      .using('xml').from('cxt:multistatus')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 201).from('cxt:copy')
      .using('body').from('cxt:body')

  .route('MOVE')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
      .using('parentSkipBody', true)
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.backend.CheckLock, 'locktoken')
      .using('resource').from('cxt:resource')
      .using('parent').from('cxt:parentResource')
    .does(webdav.http.ValidateDestination, 'dest')
    .does(webdav.http.GetNormalizedPath, 'destination')
      .using('path').from('cxt:dest')
      .using('baseURI').from('cxt:baseURI')
    .does(webdav.backend.LoadResource, 'targetResource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:destination')
      .using('skipBody', true)
    // BEGIN check locks on the destination.
    .does(webdav.backend.ParentName, 'targetParentPath')
      .using('path').from('cxt:destination')
    .does(webdav.backend.LoadResource, 'targetParentResource')
      .using('resourceBridge').from('cxt:bridge')
      .using('name').from('cxt:targetParentPath')
      .using('skipBody', true)
    .does(webdav.backend.CheckLock, 'destlocktoken') // Check the destination
      .using('resource').from('cxt:targetResource')
      .using('parent').from('cxt:targetParentResource')
    // END check locks on the destination.
    .does(webdav.http.HandleMove, 'move')
      .using('resourceBridge').from('cxt:bridge')
      .using('resource').from('cxt:resource')
      .using('targetResource').from('cxt:targetResource')
      .using('destination').from('cxt:destination')
    .does(webdav.xml.SerializeXML, 'body')
      .using('xml').from('cxt:multistatus')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 201).from('cxt:move')
      .using('body').from('cxt:body')

  .route('LOCK')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
      .using('parentSkipBody', true)
    .does(pronto.commands.BufferRequest, 'input')
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.http.VerifyPreconditions, 'prec')
      .using('resource').from('cxt:resource')
    .does(webdav.backend.CheckLock, 'locktoken')
      .using('resource').from('cxt:resource')
      .using('parent').from('cxt:parentResource')
      //.using('lock').from('cxt:lock')
      //.using('parentLock').from('cxt:parentLock')
    .does(webdav.xml.ParseXML, 'xml')
      .using('input').from('cxt:input')
    .does(webdav.http.HandleLock, 'dolock')
      .using('resource').from('cxt:resource')
      .using('parent').from('cxt:parentResource')
      .using('resourceBridge').from('cxt:bridge')
      .using('baseURI').from('cxt:path')
      .using('xml').from('cxt:xml')
      .using('lockToken').from('cxt:locktoken')
      //.using('lock').from('cxt:lock')
      //.using('parentLock').from('cxt:parentLock')
    .does(webdav.xml.SerializeXML, 'body')
      .using('xml').from('cxt:dolock')
    .does(pronto.commands.HTTPResponse)
      .using('headers').from('cxt:httpHeaders')
      .using('code', 200).from('cxt:httpStatus')
      .using('body').from('cxt:body')

  .route('UNLOCK')
    .does(pronto.commands.AddToContext, 'atc')
      .using('skipBody', true)
      .using('parentSkipBody', true)
    .includes('@bootstrap')
    .includes('@write')
    .does(webdav.backend.CheckLock, 'locktoken')
      .using('resource').from('cxt:resource')
      .using('parent').from('cxt:parentResource')
    .does(webdav.http.HandleUnlock, 'unlock')
      .using('resource').from('cxt:resource')
      .using('resourceBridge').from('cxt:bridge')
    .does(pronto.commands.HTTPResponse)
      .using('headers').from('cxt:httpHeaders')
      .using('code', 204).from('cxt:unlock')

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

  .route('@400')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Bad Request')
      .using('2', 'Bad Request')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 400)
      .using('body').from('cxt:body')
  .route('@401')
    .does(webdav.backend.ClearUserAuthCache)
      .using('endpoint').from('cxt:identityService')
      .using('projectId').from('cxt:projectid')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Unauthorized')
      .using('2', 'Unauthorized')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}).from('cxt:httpHeaders')
      .using('code', 401)
      .using('body').from('cxt:body')
  .route('@403')
    .does(webdav.backend.ClearUserAuthCache)
      .using('endpoint').from('cxt:identityService')
      .using('projectId').from('cxt:projectid')
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

  .route('@423')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Locked')
      .using('2', 'Locked').from('cxt:body')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 423)
      .using('body').from('cxt:body')

  .route('@424')
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Failed Dependency')
      .using('2', 'Failed Dependency').from('cxt:body')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 424)
      .using('body').from('cxt:body')

  .route('@500')
    .does(webdav.backend.ClearUserAuthCache)
      .using('endpoint').from('cxt:identityService')
      .using('projectId').from('cxt:projectid')
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

  .route('@502') // COPY and MOVE can issue this.
    .does(pronto.commands.SPrintF, 'body')
      .using('format', pronto.commands.SPrintF.HTML5)
      .using('1', 'Bad Gateway')
      .using('2', 'Bad Gateway').from('cxt:httpError')
    .does(pronto.commands.HTTPResponse)
      .using('headers', {}) //.from('cxt:httpHeaders')
      .using('code', 502)
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
server.listen(settings.http.port, settings.http.host);
process.on('SIGINT', function () {server.close();});
