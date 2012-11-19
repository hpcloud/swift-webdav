exports.version = "0.1.0";

var Container = require('./container');

var URL = require('url');
var Util = require('util');
var Futil = require('../futil');
var ACL = exports.ACL = require('./acl');

// A countainer.
exports.Container = Container;
// Data about an object.
exports.ObjectInfo = require('./objectinfo');
// The whole object.
exports.RemoteObject = require('./remoteobject');

// Create a new ObjectStorage instance.
exports.newFromIdentity = newFromIdentity;

// The top-level object storage object.
exports.ObjectStorage = ObjectStorage;

/**
 * Create a new ObjectStorage instance from an IdentityServices
 * Identity.
 *
 * @param {Identity} identity
 *   An identity with a service catalog.
 * @param {string} region
 *   The availability zone. e.g. 'az-1.region-a.geo-1'. If this is
 *   omitted, the first available object storage will be used.
 * @param {Function} fn
 *   A callback, which will receive an Error (if applicable) and an
 *   ObjectStorage instance.
 */
function newFromIdentity(identity, region) {
  var service = identity.serviceByName('object-store', region);
  var endpoint = service.publicURL;
  var os = new ObjectStorage(identity.token(), endpoint);

  return os;
}

/**
 * Given an authentication token and an endpoint, create an
 * ObjectStorage instance.
 *
 * @param {string} authToken
 *   An authentication token. These typically are supplied by Identity
 *   Services.
 * @param {string} endpoint
 *   An endpoint base URL.
 */
function ObjectStorage(authToken, endpoint) {
  this.token = authToken;
  this.endpoint = endpoint;
}

/**
 * Get the token.
 *
 * @return {string}
 *   The auth token.
 */
ObjectStorage.prototype.tokens = function () {
  return this.token;
}
/**
 * Get the endpoint URL.
 *
 * @param {string}
 *  The URL endpoint.
 */
ObjectStorage.prototype.url = function () {
  return this.endpoint;
}

ObjectStorage.prototype.useCDN = function (cdn) {
  throw new Error('useCDN is not implemented.');
}
ObjectStorage.prototype.hasCDN = function (name) {
  throw new Error('hasCDN is not implemented.');
}
ObjectStorage.prototype.cdnUrl = function (name, useSSL) {
  throw new Error('cdnUrl is not implemented.');
}


/**
 * Create a new container.
 *
 * When this is successful, the callback function will receive a
 * Container object. This object will have a flag (container.isNew)
 * indicating whether this container was just created (true) or whether
 * it existed prior to this call (false).
 *
 * Attempting to create an already existing container will NOT result in
 * an error. It will simply result in container.isNew being set to false.
 *
 * @param {string} name
 *   The name of the container.
 * @param {ACL} acl
 *   An access control list. If ACL is not set, the default ACL will be
 *   private.
 * @param {object} metadata
 *   An object of name/value metadata pairs.
 * @param {Function} fn
 *   The callback, which will be executed as fn(Error, Container). Error
 *   will only be set if an error is encountered. Otherwise, a Container
 *   object will be returned.
 */
ObjectStorage.prototype.createContainer = function (name, acl, metadata, fn) {

  if (!acl) {
    acl = new ACL();
  }

  var url = this.endpoint + '/' + encodeURI(name);
  var token = this.token;
  var opts = URL.parse(url);
  opts.method = 'PUT';
  opts.headers = this.standardHeaders();

  // Encode the metadata as container metadata.
  //ObjectStorage.encodeContainerMetadata(metadata, opts.headers);
  Container.encodeMetadata(metadata, opts.headers);

  // Do the request.
  Transport.doRequest(opts, null, function (error, response, data) {
    if (error) {
      fn(error);
      return;
    }

    var container = new Container(name, token, url);
    container.isNew = response.statusCode == 201;

    fn(false, container);
  });
  
}
/**
 * Delete a container from the remote object storage.
 *
 * This will destroy the container and all of its contents.
 *
 * @param {String} name
 *   The name of the container.
 * @param {Function} fn
 *   The callback to be executed when the operation is complete. This
 *   will be executed as fn(Error, Boolean), where the boolean will be
 *   set to 'true' if the container was successfully deleted.
 */
ObjectStorage.prototype.deleteContainer = function (containerName, fn) {
  var url = this.endpoint + '/' + encodeURI(containerName);
  var opts = URL.parse(url);
  opts.method = 'DELETE';
  opts.headers = this.standardHeaders();

  Transport.doRequest(opts, null, function (error, response, data) {
    if (error) {
      fn(error, false);
      return;
    }

    var deleted = response.statusCode == 204;
    fn (false, deleted);
    return;
  });
}

/**
 * Get a list of containers from the remote server.
 *
 * By default, this fetches the entire list of containers for the
 * given account. If you have more than 10,000 containers (who
 * wouldn't?), you will need to use `marker` for paging.
 *
 * If you want more controlled paging, you can use `limit` to indicate
 * the number of containers returned per page, and `marker` to indicate
 * the last container retrieved.
 *
 * Containers are ordered. That is, they will always come back in the
 * same order. For that reason, the pager takes `marker` (the name of
 * the last container) as a paging parameter, rather than an offset
 * number.
 *
 * @param {int} limit (Optional)
 *   The maximum number of records to be returned.
 * @param {String} marker (Optional)
 *   The name of the last entry received.
 * @param {Function} fn
 *   The callback. This will receive two parameters: fn(Error e, Array listOfContainers).
 */
ObjectStorage.prototype.containers = function (limit, marker, fn) {

  // Handle optional params.
  var a = Futil.argsWithFn(arguments, ['limit', 'marker', 'fn'])
  limit = a.limit;
  marker = a.marker;
  fn = a.fn;

  var url = this.url() + '?format=json';
  if (a.limit) {
    url += '&limit=' + encodeURIComponent(a.limit);
  }
  if (a.marker) {
    url += '&marker=' + encodeURIComponent(a.marker);
  }

  var opts = URL.parse(url);
  opts.method = 'GET';
  opts.headers = this.standardHeaders();

  var token = this.token;
  var url = this.url();

  Transport.doRequest(opts, function (error, response, data) {
    if (error) {
      fn(error);
      return;
    }

    var list = [];
    var containerArray = JSON.parse(data);
    for (var i = 0; i < containerArray.length; ++i) {
      list.push(Container.newFromJSON(containerArray[i], token, url));
    }
    fn(false, list);
  });
}

/**
 * Check whether a container exists.
 *
 * This calls fn() with a single param: a boolean indicating whether the
 * container exists (true) or not (false).
 *
 * The performance hit for calling hasContainer() is equal ot that of
 * calling container(). In most cases, it's better to just call container().
 *
 * @param {String} name
 *   The name of the container.
 * @param {Function} fn
 *   This is executed with the single boolean param.
 */
ObjectStorage.prototype.hasContainer = function (name, fn) {
  this.container(name, function (e, c) {
    // If there is an error or no container, return false.
    if (e) {
      fn(false);
      return;
    }
    fn(true);
  });
}

/**
 * Fetch a container by name.
 *
 * This retrieves a single Container from object storage.
 *
 * @param {String} name
 *   The name of the container.
 * @param {Function} fn
 *   The callback to be executed. It will receive two arguments:
 *   an fn(Error, Container).
 */
ObjectStorage.prototype.container = function (name, fn) {
  var opts = URL.parse(this.url() + '/' + encodeURI(name));
  opts.method = 'HEAD';
  opts.headers = this.standardHeaders();

  var token = this.token;
  var url = this.url();

  Transport.doRequest(opts, null, function (error, response, data) {
    if (error) {
      fn(error);
      return;
    }

    var container = Container.newFromResponse(name, response, token, url);

    fn(false, container);

  });

}

/**
 * Update an existing container.
 *
 * Currently this is an alias of ObjectStorage.createContainer().
 *
 * The present version of the Swift REST API does not distinguish between
 * creating and updating containers. You are advised, however, to update
 * using this method. If the future Swift API changes, this method will
 * be adjusted accordingly.
 */
ObjectStorage.prototype.updateContainer = function (name, acl, metadata, fn) {
  this.createContainer(name, acl, metadata, fn);
}

/**
 * Change a container's ACL.
 *
 * Currently this is an alias of ObjectStorage.createContainer().
 *
 * The present version of the Swift REST API does not distinguish between
 * creating and updating containers. You are advised, however, to update
 * using this method. If the future Swift API changes, this method will
 * be adjusted accordingly.
 */
ObjectStorage.prototype.changeContainerACL = function (containerName, acl, fn) {
  var metadata;
  this.createContainer(name, acl, metadata, fn);
}

/**
 * Get information about this container.
 *
 * @param {Function} fn
 *   The callback. Callback will receive fn(Error, Object), where Error
 *   is only set if an error occurs, and Object will have the following
 *   properties:
 *   - o.bytes: the total space used.
 *   - o.objects: the number of objects.
 *   - o.containers: the number of containers.
 */
ObjectStorage.prototype.accountInfo = function (fn) {
  var opts = URL.parse(this.url());
  opts.method = 'HEAD';
  opts.headers = this.standardHeaders();

  Transport.doRequest(opts, null, function (error, response, data) {
    if (error) {
      fn(error);
      return;
    }

    var results = {
      bytes:      response.headers['x-account-bytes-used'],
      containers: response.headers['x-account-container-count'],
      objects:    response.headers['x-account-object-count']
    }

    fn(false, results);
  });


}

/**
 * Internal method for building standard HTTP headers.
 */
ObjectStorage.prototype.standardHeaders = function () {
  return {
    'X-Auth-Token': this.token
  };
}

