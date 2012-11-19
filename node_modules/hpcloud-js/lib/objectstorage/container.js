/**
 * A container holds numerous objects. A single object storage instance
 * may have an indefinite number of containers, and each container may
 * have an indefinite number of objects. However, containers may not
 * have subcontainers.
 *
 * A container is not a directory. It is closer (to use a file system
 * analogy) to a file system volume.
 */

var Util = require('util');
var URL = require('url');
var Futil = require('../futil');
var Transport = require('../transport');
var ACL = require('./acl');
var ObjectInfo = require('./objectinfo');
var RemoteObject = require('./remoteobject');
var Subdir = require('./subdir');


module.exports = Container;

/**
 * Create a new container.
 *
 * When a new container is created, no check is done against the server
 * to ensure that the container exists. Thus, it is possible to have a
 * local container object that does not point to a legitimate
 * server-side container.
 *
 * @param {String} name
 *   The name of the container.
 * @param {String} token
 *   An authentication token.
 * @param {String} url
 *   The URL of the container.
 */
function Container(name, token, url) {
  this._name = name;
  this._url = url;
  this._token = token;
  this.isNew = false;
}

/**
 * Construct a new Container from a response.
 *
 * Internally, this is used to build a new container from HTTP headers.
 *
 * @param {String} name
 *   The name of the container.
 * @param {HTTPResponse} response
 *   An HTTP response object.
 * @param {String} token
 *   An authentication token.
 * @param {String} endpoint
 *   The URL to the Swift REST endpoint. This is used as the base URL to
 *   construct a URL to the container itself.
 * @return {Container}
 *   A container object.
 */
Container.newFromResponse = function (name, response, token, endpoint) {
  var url = endpoint + '/' + encodeURI(name);
  var container = new Container(name, token, url);
  var headers = response.headers;

  container._bytes = headers['x-container-bytes-used'];
  container._count = headers['x-container-object-count'];
  container._baseUrl = endpoint;

  var metadata = Container.decodeMetadata(headers);
  container.setMetadata(metadata);

  this._acl = ACL.newFromHeaders(headers);

  return container;
}

/**
 * Create a new Container from JSON data.
 *
 * This is used to create a new container object from a JSON response.
 *
 * @param {Object} json
 a*   JSON data in the correct format.
 * @param {String} token
 *   The auth token.
 * @param {String} url
 *   The URL to object storage. This will be modified internally to 
 *   point to this container.
 * @return {Container}
 *   A container object.
 */
Container.newFromJSON = function (json, token, url) {
  var fullUrl = url + '/' + encodeURI(json.name);
  var container = new Container(json.name, token, fullUrl);
  container._baseUrl = url;
  container._count = json.count || 0;
  container._bytes = json.bytes || 0;

  return container;
}

/**
 * Get the name of this container.
 *
 * @return {String}
 *   The container name.
 */
Container.prototype.name = function() {
  return this._name;
}

Container.prototype.token = function () {
  return this._token;
}
/**
 * Get the byte count for this container.
 *
 * Retrieves the number of bytes this container currently
 * consumes.
 *
 * @return {int}
 *   The byte count.
 */
Container.prototype.bytes = function () {
  return this._bytes || 0;
}
/**
 * Get the number of objects in the container.
 *
 * This returns the count of objects currently inside of the container.
 * This is the total number of objects, not the number of objects at the
 * "top level" of the container.
 *
 * @return {int}
 *   The number of items in the container.
 */
Container.prototype.count = function () {
  return this._count || 0;
}
/**
 * Get the URL of this container.
 *
 * @return {String}
 *   The URL pointing to this container.
 */
Container.prototype.url = function () {
  return this._url;
}

/**
 * Get the ACL for the current container.
 *
 * In some cases, this will result in a request to the
 * remote server.
 *
 * @param {Function} fn
 *   The callback, which will receive fn(Error e, ACL acl);
 */
Container.prototype.acl = function (fn) {
  if (this._acl== undefined) {
    this.fetchDetails(this, function (e, container) {
      // container is actually the outer object.
      fn(e, container._acl);
    });
  }
  else {
    fn(false, this._acl);
  }
}

/**
 * Get the metadata for a container.
 *
 * Depending on how the container was constructed, this may require a
 * trip to the remote server to fetch metadata.
 *
 * @param {Function} fn
 *   The callback, which will receive two parameters:
 *   fn(Error e, Object metadata).
 */
Container.prototype.metadata = function (fn) {
  if (this._metadata == undefined) {
    this.fetchDetails(this, function (e, container) {
      // container is actually the outer object.
      fn(e, container._metadata);
    });
  }
  else {
    fn(false, this._metadata);
  }
}
/**
 * Set the metadata on the present object.
 *
 * This does NOT save the metadata on the remote server.
 *
 * @param {Object} metadata
 *   Name/value pairs for metadata. It is recommended that you encode the values
 *   prior to putting them here, as the Swift REST docs make no assumptions about
 *   how the metadata is encoded or decoded.
 */
Container.prototype.setMetadata = function (metadata) {
  this._metadata = metadata;
}

// ============================================
// CDN functions
// ============================================

Container.prototype.cdnUrl = function () {
  throw new Error('Not implemented.');
}
Container.prototype.useCDN = function () {
  throw new Error('useCDN not implemented.');
}

// ============================================
// Object functions
// ============================================

/**
 * Update the metadata on an object.
 *
 * This allows you to update an object's metadata without
 * requiring you to re-post the object's data payload.
 *
 * According to the Swift documentation, this ONLY modifies the arbitrary
 * metadata (See ObjectInfo.setMetadata()). Other info, including content type,
 * disposition, and so on, cannot be changed this way.
 *
 * IMPORTANT: To change the Content-Type of an object, you can use the
 * Container.copy() method, copying the source to the same destination.
 *
 * @param {ObjectInfo} info
 *   The local copy of the object that should be updated on the remote server.
 * @param {Function} fn
 *   The callback. This is called as fn(Error e).
 */
Container.prototype.updateObjectMetadata = function (info, fn) {
  var url = this.url() + '/' + encodeURI(info.name());
  var opts = URL.parse(url);
  opts.method = 'POST';
  opts.headers = {
    'X-Auth-Token' : this._token,
    'Content-Type': info.contentType()
  }
  info.mergeMetadataHeaders(opts.headers);

  Transport.doRequest(opts, function (e, response) {
    if (e) {
      fn(e);
      return;
    }
    fn(false);
  });

}
/**
 * Write an object to the remote data store.
 *
 * Importantly, certain fields on the ObjectInfo are ignored when saving:
 * - eTag: This is generated on the fly to ensure accuracy.
 * - Content-Length: This is not used, since we send with chunked encoding.
 *
 * @param {ObjectInfo} obj
 *   The object to write.
 * @param {String|Buffer|Stream} content
 * @param {Function} fn
 *   The callback. fn(Error e, HTTPResponse r)
 */
Container.prototype.save = function (obj, content, fn) {
  var url = this.url() + '/' + encodeURI(obj.name());
  var opts = URL.parse(url);
  opts.method = 'PUT';
  opts.headers = {
    'X-Auth-Token' : this._token,
    'Content-Type': obj.contentType()
  }
  var encoding = obj.transferEncoding();
  var disposition = obj.disposition();

  if (encoding) {
    opts.headers['Content-Encoding'] = encoding;
  }
  if (disposition) {
    opts.headers['Content-Disposition'] = disposition;
  }

  // Add metadata.
  obj.mergeMetadataHeaders(opts.headers);
  obj.mergeAdditionalHeaders(opts.headers);

  Transport.doChunkedRequest(opts, content, function (e, response, data, md5) {

    if (e) {
      fn(e);
      return;
    }

    // The ETag that is returned from ObjectStorage should match the MD5 checksum that
    // we generate here. Since we're streaming data, we don't send an ETag with the initial
    // request, so Swift can't do an integrity check. Consequently, it is our responsibility
    // to do this.
    // FIXME: This should probably be an event emitter so that a listener can rollback a save
    // if they want.
    var eTag = response.headers.etag;
    //console.log("ETag: %s, MD5: %s", eTag, md5);
    if (eTag != md5) {
      fn(new Error('Expected ETag ' + eTag + ' to match ' + md5));
      return;
    }

    fn(false, response);

  });

}
/**
 * Copy a resource from one path to another, or from one container to another.
 *
 * This does a remote-side copy, so the payload is never transferred locally.
 *
 * An interesting side effect of copy() is that you can change the metadata of a destination
 * object by supplying alternative metadata during copy. You can also change content type
 * and other properties. Since you can copy an object to itself, this is the
 * cheapest way to change metadata.
 *
 * To do this, provide an ObjectInfo as the first argument. That will then be used to
 * set headers and metadata.
 *
 * @param {ObjectInfo|String} info
 *   The object to copy.
 * @param {String} newName
 *   The name of the new object.
 * @param {String} containerName (Optional)
 *   The name of the container to copy to. If none is specified, the present
 *   container is used.
 * @param {Function} fn
 *   The callback, called like this: fn(Error e);
 */
Container.prototype.copy = function (info, newName, containerName, fn) {
  var a = Futil.argsWithFn(arguments, ['info', 'newName', 'containerName', 'fn']);
  info = a.info;
  newName = a.newName;
  containerName = a.containerName || this.name();
  fn = a.fn;

  // Source
  var sourceName = info instanceof ObjectInfo ? info.name() : info;
  var sourceUrl = this.url() + '/' + encodeURI(sourceName);

  // Destination: This is of the form /CONAINER/PATH
  var destUrl;
  destUrl = '/' + encodeURI(containerName) + '/' + encodeURI(newName);

  var opts = URL.parse(sourceUrl);
  opts.method = 'COPY';
  opts.headers = {
    'X-Auth-Token': this._token,
    'Destination': destUrl
  }

  // Swift allows us to mutate the metadata on the destination object.
  if (info instanceof ObjectInfo) {
    // Add metadata.
    info.mergeMetadataHeaders(opts.headers);
    info.mergeAdditionalHeaders(opts.headers);

    // This happens if the info object was loaded from a list, and these
    // properties were never set. This is okay.
    var encoding;
    var disposition;
    try {
      encoding = info.transferEncoding();
      disposition = info.disposition();
    } catch (e) {}

    var type = info.contentType();

    if (encoding) {
      opts.headers['Content-Encoding'] = encoding;
    }
    if (disposition) {
      opts.headers['Content-Disposition'] = disposition;
    }
    if (type) {
      opts.headers['Content-Type'] = type;
    }
  }

  Transport.doRequest(opts, function (e, response) {
    if (e) {
      fn(e);
      return;
    }
    fn(false);
  });
}
/**
 * Get information about an object.
 *
 * This includes all of the standard data (name, content type,
 * content length, eTag/md5, and so on) as well as any 
 * metadata that was attaached to the object.
 *
 * This does NOT get the object's body. The object() method
 * must be used for that.
 *
 * @param {String} name
 *   The name of the object to retrieve.
 * @param {Function} fn
 *   A callback.
 */
Container.prototype.objectInfo = function (name, fn) {
  var opts = URL.parse(this.url() + '/' + encodeURI(name));
  opts.method = 'HEAD';
  opts.headers = {
    'X-Auth-Token' : this._token,
  }

  var token = this._token;
  var baseUrl = this.url();

  Transport.doRequest(opts, function (e, response) {
    if (e) {
      fn(e);
      return;
    }

    var info = ObjectInfo.newFromResponse(name, response, token, baseUrl);
    fn(false, info);
  });
}

/**
 * Get a RemoteObject instance.
 *
 * This fetches an object from object storage.
 *
 * The returned object is a stream, and will also have
 * an ObjectInfo attached.
 *
 * Importantly, no processing is done on the returned object. It is passed on
 * as-is. No length or etag checking is done. No content type validation is done.
 * The data is not read first and buffered.
 *
 * @param {String} name
 *   The name of the object to fetch.
 * @param {Function} fn
 *   The callback, called as
 *   fn(Error e, RemoteObject o)
 */
Container.prototype.remoteObject = function (name, fn) {

  var opts = URL.parse(this.url() + '/' + encodeURI(name));
  opts.method = 'GET';
  opts.headers = {
    'X-Auth-Token' : this._token,
  }
  Transport.doUnmanagedRequest(opts, function (e, response) {
    if (e) {
      fn(e);
      return;
    }

    var obj = new RemoteObject(name, response);

    fn(false, obj);
  });
}
Container.prototype.object = Container.prototype.remoteObject;

/**
 * Query for an object.
 *
 * See objects(), objectsWithPrefix(), and objectsByPath() for simpler queries.
 *
 * The following params are supported:
 * - params.limit: set the maximum number of items returned
 * - params.marker: get the next item after the named marker. Marker is an object name.
 * - params.prefix: Use prefix/delimiter notation to get a "subdirectory" listing.
 * - params.delimiter: the delimiter to use to separate directories. Usually '/'.
 * - params.path: Use a path prefix to get children on a path.
 *
 * @param {Object} params
 *   Any number of paramters, as specified above.
 * @param {Function} fn
 *   The callback, executed as fn(Error e, Array list). The Array is a list of
 *   ObjectInfo items and (depending on params) Subdir items.
 */
Container.prototype.objectQuery = function (params, fn) {
  var pstring = '?format=json';
  if (params.limit != undefined) {
    pstring += '&limit=' + encodeURI(params.limit);
  }
  if (params.marker != undefined) {
    pstring += '&marker=' + encodeURIComponent(params.marker);
  }
  if (params.delimiter != undefined) {
    pstring += '&delimiter=' + encodeURIComponent(params.delimiter);
  }

  // Only one of path or prefix is allowed.
  if (params.prefix != undefined) {
    pstring += '&prefix=' + encodeURIComponent(params.prefix);
  }
  else if (params.path != undefined) {
    pstring += '&path=' + encodeURIComponent(params.path);
  }

  var url = this.url() + pstring;
  var opts = URL.parse(url);
  opts.method = 'GET';
  opts.headers = {
    'X-Auth-Token' : this._token,
  }

  var token = this.token();
  var baseUrl = this.url();
  Transport.doRequest(opts, function (e, response, data) {
    if (e) {
      fn(e);
      return;
    }
    var json = JSON.parse(data);
    var list = [];
    for (var i = 0; i < json.length; ++i) {
      var item = json[i];
      if (item.subdir == undefined) {
        list.push(ObjectInfo.newFromJSON(item, token, baseUrl));
      }
      else {
        list.push(new Subdir(item.subdir, params.delimiter));
      }

    }
    fn(false, list);
  });
}
Container.prototype.objects = function (limit, marker, fn) {
  var params = Futil.argsWithFn(arguments, ['limit', 'marker', 'fn']);
  fn = params.fn;

  // Unset this just to be safe.
  params.fn = undefined;

  this.objectQuery(params, fn);
}
/**
 * Retrieve a list of Objects with the given prefix.
 *
 * Object Storage containers support directory-like organization. To
 * get a list of items inside of a particular "subdirectory", provide
 * the directory name as a "prefix". This will return only objects
 * that begin with that prefix.
 *
 * (Directory-like behavior is also supported by using "directory
 * markers". See objectsByPath().)
 *
 * Prefixes
 *
 * Prefixes are basically substring patterns that are matched against
 * files on the remote object storage.
 *
 * When a prefix is used, object storage will begin to return not just
 * Object instsances, but also Subdir instances. A Subdir is simply a
 * container for a "path name".
 *
 * Delimiters
 *
 * Object Storage (OpenStack Swift) does not have a native concept of
 * files and directories when it comes to paths. Instead, it merely
 * represents them and simulates their behavior under specific
 * circumstances.
 *
 * The default behavior (when prefixes are used) is to treat the '/'
 * character as a delimiter. Thus, when it encounters a name like
 * this: `foo/bar/baz.txt` and the prefix is `foo/`, it will
 * parse return a Subdir called `foo/bar`.
 *
 * Setting `delimiter` will tell the Object Storage server which
 * character to parse the filenames on. This means that if you use
 * delimiters other than '/', you need to be very consistent with your
 * usage or else you may get surprising results.
 *
 * @param {String} prefix
 * @param {String} delimiter
 * @param {int} limit
 * @param {String} marker
 * @param {Function} fn
 *   The callback will receive fn(Error e, Array list), where the array is a list of
 *   ObjectInfo objects.
 */
Container.prototype.objectsWithPrefix = function (prefix, delimiter, limit, marker, fn) {
  var a = Futil.argsWithFn(arguments, ['prefix', 'delimiter', 'limit', 'marker', 'fn']);
  fn = a.fn;
  a.fn = undefined;

  this.objectQuery(a, fn);
}
/**
 * Specify a path (subdirectory) to traverse.
 *
 * OpenStack Swift provides two basic ways to handle directory-like
 * structures. The first is using a prefix (see objectsWithPrefix()).
 * The second is to create directory markers and use a path.
 *
 * A directory marker is just a file with a name that is
 * directory-like. You create it exactly as you create any other file.
 * Typically, it is 0 bytes long with the content type `application/directory`
 *
 * Using objectsByPath() with directory markers will return a list of
 * Object instances, some of which are regular files, and some of
 * which are just empty directory marker files. When creating
 * directory markers, you may wish to set metadata or content-type
 * information indicating that they are directory markers.
 *
 * At one point, the OpenStack documentation suggested that the path
 * method was legacy. More recent versions of the documentation no
 * longer indicate this.
*/
Container.prototype.objectsByPath = function (path, delimiter, limit, marker, fn) {
  var a = Futil.argsWithFn(arguments, ['path', 'delimiter', 'limit', 'marker', 'fn']);
  fn = a.fn;
  a.fn = undefined;

  this.objectQuery(a, fn);
}

/**
 * Delete an object.
 *
 * @param {String} name
 *   The name of the object to delete.
 * @param {Function} fn
 *   The callback. Called with fn(Error e, boolean status).
 *   Errors are returned if the resource could not be found. `status` will
 *   be true if the resource was deleted.
 */
Container.prototype.delete = function (name, fn) {
  var opts = URL.parse(this.url() + '/' + encodeURI(name));
  opts.method = 'DELETE';
  opts.headers = {
    'X-Auth-Token': this._token
  }

  Transport.doRequest(opts, function (e, res) {
    if (e) {
      fn(e);
      return;
    }
    // Anything we need to do here?
    fn(e, res.statusCode == 204);
  });
}

// ============================================
// Internal/Util Functions
// ============================================

/**
 * fn(Error, Container);
 */
Container.prototype.fetchDetails = function (container, fn) {
  var url = container.url();
  var token = container.token();
  // Need a check here.
  var opts = URL.parse(url);
  opts.method = 'GET';
  opts.headers = {
    'X-Auth-Token': token
  }
  Transport.doRequest(opts, function (e, response) {
    if (e) {
      fn(e, {});
      return;
    }
    var headers = response.headers;

    container._bytes = headers['x-container-bytes-used'];
    container._count = headers['x-container-object-count'];

    container._acl = ACL.newFromHeaders(headers);

    var metadata = Container.decodeMetadata(headers);
    container.setMetadata(metadata);
    fn(false, container);
  });

};


Container.encodeMetadata = function (metadata, headers) {
  if (!headers) {
    headers = {};
  }

  var format = "X-Container-Meta-%s";
  for (var name in metadata) {
    var newName = Util.format(format, encodeURIComponent(name));
    headers[newName] = metadata[name];
  }
  return headers;
}

Container.decodeMetadata = function (headers) {
  var metadata = {};
  var prefix = 'x-container-meta-';
  var plen = prefix.length;
  for (header in headers) {
    if (header.indexOf(prefix) == 0) {
      var m = decodeURIComponent(header.substring(plen));
      metadata[m] = headers[header];
    }
  }
  return metadata;
}
