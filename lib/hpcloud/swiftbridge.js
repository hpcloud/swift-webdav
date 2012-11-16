var util = require('util');
var Path = require('path');
var hpcloud = require('hpcloud-js');
var async = require('async');
var ResourceBridge = require('../resourcebridge');
var BufferedReader = require('pronto').streams.BufferedReader
var SwiftUtils = require('./swiftutils');
var Lock = require('../backend/lock');
var Property = require('../http/property');
/**
 * A resource bridge for Swift.
 *
 * This library is responsible for implementing all of the FS operations
 * to bridge DAV and Swift. Almost all Swift-specific code lives in this
 * library.
 *
 * Any function not documented here is documented in ResourceBridge.
 *
 * @param {Identity} identity
 *   An identity services Identity object.
 * @param {String} endpoint
 *   The IdentityServices endpoint URL.
 * @param {String} baseURI
 *   The base URI for the server.
 * @param {String} region
 *   The string region name.
 * @param {String} container
 *   The name of the present container.
 */
function SwiftBridge(identity, endpoint, baseURI, region, container){
  this.identity = identity;
  this.region = region;
  this.baseURI = baseURI;
  this.containerName = container;
  this.endpoint = endpoint;

  if (identity.tenantId() && region) {
    this.store = hpcloud.ObjectStorage.newFromIdentity(identity, region);
    //console.log(this.store);
  }
}
util.inherits(SwiftBridge, ResourceBridge);
module.exports = SwiftBridge;

SwiftBridge.XML_NS = 'hpcloud:webdav';

/**
 * Set the context.
 */
SwiftBridge.prototype.setContext = function (cxt) {
  this.cxt = cxt;
}

SwiftBridge.prototype.load = function (name, fn){
  var now = Date.now();
  if (!this.identity.tenantId()) {
    // Document root.
    var root = this._pseudoCollection('/', now);
    root.isRoot = true;
    fn(false, root);
    return;
  }
  else if (!this.containerName) {
    // Tenant root.
    var project = this._pseudoCollection('/' + this.identity.tenantId() + '/', now);
    project.isTenant = true;
    fn(false, project);
    return;
  }
  else {
    var path = this.pathTo(name);
    // We're somewhere inside of a container.
    this.cxt.log("Container: %s, URI: %s, Path: %s", this.containerName, name, path, 'debug');

    var self = this;
    this.cxt.log("Loading container %s: load", this.containerName, "custom");
    this.store.container(this.containerName, function (e, container){
      if (e) {
        e.status = 404;
        fn(e);
        return;
      }
      if (path) {
        self.cxt.log("Loading path %s", path, "debug");
        self.loadObject(path, name, container, fn);
      }
      else {
        var col = self._pseudoCollection(name, now);
        col.isCollection = true;
        fn(false, col);
        return;
      }
    });
  }
}

SwiftBridge.prototype.listContents = function (collection, deep, fn){
  // For performance reasons, we don't honor depth-infinity listings on
  // the root or on the container listing, as each of these could
  // potentially result in tens of thousands of HTTP requests. However,
  // we can easily accomodate when listing container contents.
  if (collection.isRoot) {
    this.listProjects(fn);
  }
  else if (collection.isTenant) {
    this.listContainers(fn);
  }
  else {
    this.listObjects(collection, deep, fn);
  }
}

SwiftBridge.prototype.mkcol = function (collection, fn){
  var path = this.pathTo(collection.name());
  // Cannot trust that isRoot will always be set. An empty collection
  // object may not have the right flags set.
  if (collection.isRoot || !this.identity.tenantId()) {
    var e = new Error('Cannot create containers outside of project.');
    e.status = 403;
    fn(e);
  }
  else if (collection.isCollection && path.length == 0) {
    this.cxt.log("Creating container.", "debug");
    this.mkContainer(collection, fn);
  }
  else {
    this.cxt.log("Creating directory marker.", "debug");
    this.mkDirectory(collection, fn);
  }
}

SwiftBridge.prototype.save = function (resource, stream, fn){
  var objInfo = this.resourceToObject(resource);

  // Get the parent container.
  // NOTE: e.status  is the code that will get sent to the client, but
  // e.statusCode (returned from HPCloud-JS) is the status code Swift
  // sent. This may differ from what we send to the client.
  this.store.container(this.containerName, function (e, container) {
    if (e) {
      e.status = 409; // Conflict. Assume container does not exist.
      fn(e);
      return;
    }

    // Save the object.
    container.save(objInfo, stream, function (e, data) {
      if (e) {
        e.status = e.statusCode == 0 ? 500 : 403; // Permission denied (412 or 422 caused it)
        fn(e);
        return;
      }
      var h = data.headers;
      var ret = {
        etag: h.etag || null,
        date: Date.parse(h.date),
        created: data.statusCode == 201
      };
      fn(false, ret);
    });
    // The stream is probably paused.
    //console.log("calling resume.");
    stream.resume();
  });
}

SwiftBridge.prototype.deleteCollection = function (resource, fn){
  var self = this;

  // The WebDAV spec suggests that when a delete occurs, if any part of
  // the delete fails, we should roll back the entire thing. In
  // practice, this is incredibly hard to do because we cannot locally
  // buffer any data, and storing more data in the client's account will
  // cost them money. It is also difficult becaue the most likely reason
  // for a deletion failure is a disconnection between here and the
  // server, which prevents us from stopping and restoring.
  //
  // That said, the common cause for failures in WebDAV is from
  // permissions violations, which we do not encounter with near the
  // frequency, since objects do not have permissions that differ from
  // the container. So for the time being, we take a lax approach and do
  // not support rollbacks. In the future, though, we should fix this.

  // If collection is a tenantID, return 403.
  if (!this.identity.tenantId() || !this.containerName) {
    var err = new Error("Cannot delete projects or the document root");
    err.status = 403;
    fn(err);
    return;
  }

  var path = this.pathTo(resource.name());
  // If collection is a container, destroy the container.
  if (path.length == 0) {
    // Delete all the contents of the container...
    this.deleteDirectory(resource, path, function (e, multi) {
      // If an error occured, abort.
      if (e) {
        fn(e);
        return;
      }
      // Then delete the container.
      self.cxt.log("Delete the container: deleteCollection", "custom");
      self.store.deleteContainer(self.containerName, function (e, wasThere) {
        if (e) {
          e.status = (e.statusCode && e.statusCode == 409) ? 409 : 403;
          fn(e);
        }
        else if (!wasThere) {
          var err = new Error('Collection not found.');
          err.status = 404;
          fn(e);
        }
        else {
          fn(false, multi);
        }
      });
    });
  }
  // If collection is a directory marker, delete contents.
  // The one complexity here is that a non-directory marker can also be
  // "deleted".
  else {
    this.deleteDirectory(resource, path, fn);
    return;
  }
}
/**
 * Helper function for deleting directory markers and subdirs.
 */
SwiftBridge.prototype.deleteDirectory = function (resource, path, fn) {
  var self = this;
  var multi = [];
  // XXX: We don't capture errors here.
  function _iter(info, container, _cb) {
    // Ignore errors, otherwise the iteration will stop.
    //self.deleteFile(info, function (e, name) {
    self._deleteFile(info, info.name(), container, function (e, name) {
      if (e) {
        multi.push({e: e, href: self.uriTo(name), status: 403 });
      }
      _cb();
    });
  }
  function _done(err, container) {
    if (err) {
      fn(err);
      return;
    }
    // Delete the directory itself.
    self._deleteFile(self.resourceToObject(resource), self.pathTo(resource.name()), container, function(e) {
      // FIXME: What should be done with multi?
      fn(false, multi);
    });
  }
  this.cxt.log("Deleting directory %s in %s", path, this.containerName, "debug");
  this.withEachObjectIn(path, this.containerName, _iter, _done);
}

SwiftBridge.prototype.deleteFile = function (file, fn){
  var self = this;
  var path = this.pathTo(file.name());
  this.cxt.log("Get container: deleteFile", 'custom');
  this.store.container(this.containerName, function (e, container) {
    if (e) {
      e.status = 404;
      fn(e);
      return;
    }
    self._deleteFile(file, path, container, fn);
  });
}

/**
 * Helper function for deleteFile and deleteDirectory.
 */
SwiftBridge.prototype._deleteFile = function (file, path, container, fn) {
  this.cxt.log("Delete file %s: deleteFile", file.name(), 'custom');
  container.delete(path, function (e, status) {
    if (e) {
      // Real error. 403?
      e.status = 403;
      fn(e, file.name());
    }
    else if (!status) {
      // 404
      var err = new Error('File not found');
      err.status = 404;
      fn(err, file.name());
    }
    else {
      // Success
      fn(false, file.name());
    }
  });

}

// I may use slang in my code, yo, but at least I punctuate it
// correctly.

SwiftBridge.prototype.copy = function (src, dest, overwrite, fn){

  // No copying outside of containers.
  if (!this.identity.tenantId() || !this.containerName) {
    var err = new Error('Cannot copy tenants.');
    err.status = 403;
    fn(err);
    return;
  }

  var self = this;
  var srcPath = this.pathTo(src.name());
  var destParts = this.parseDestinationURI(dest);
  var parent = Path.dirname(destParts.path);

  // Basic copy function runs on each item that needs to be copied.
  function _eachItem(item, srcContainer, cb) {
    var itemName = item.name();
    var destPath = destParts.path;
    if (itemName.length > 0) {
      //if (destPath.slice(-1) != '/') {
      //  destPath += '/';
      // }
      destPath = Path.join(destPath, itemName.substring(srcPath.length));
    }

    self.cxt.log('Copying %s to %s in %s', item.name(), destPath, destParts.containerName, 'debug');

    // Run the copy.
    self.cxt.log("Copying individual item from %s to %s: copy._eachItem", item.name(), destPath, "custom");
    srcContainer.copy(item, destPath, destParts.containerName, function (e) {
      if (e) {
        self.cxt.log("Could not copy resource.", "debug");
        e.status = e.statusCode == 404 ? 409 : 403;
      }
      cb(e);
    });
  }

  function _done(e, container) {
    var o = self.resourceToObject(src);
    self.cxt.log("Copying %s to %s in %s: copy._done", o.name(), destParts.path, destParts.containerName, "custom");
    container.copy(o, destParts.path, destParts.containerName, fn);
  }

  // Cannot copy tenants or root level.
  if (!destParts || destParts.projectId != this.identity.tenantId()) {
    this.cxt.log("Cannot copy across tenants.", "info");
    var err = new Error('Cannot copy tenants.');
    err.status = 403;
    fn(err);
    return;
  }
  // Cannot copy when there is no container name.
  else if (!destParts.containerName) {
    this.cxt.log("Cannot copy to location outside of container.", "info");
    var err = new Error('Target container is required.');
    err.status = 403;
    fn(err);
    return;
  }
  // Cannot copy a file onto the collection level.
  else if (!src.isCollection && destParts.path.length == 0) {
    var e = new Error("Cannot copy a file outside of a container.");
    this.cxt.log(e.message, "debug");
    e.status = 403;
    fn(e);
    return;
  }
  // Container-level copy. To do this "right" we have to destroy a
  // container and then recreate it. This is sorta dangerous. Things to
  // worry about:
  // - ACLs: Copy or remove?
  // - CDN setup: Alter?
  // - Destruction of data: Destroying a container requires destroying
  //   its entire contents.
  //
  // One possible stopgap would be to allow subfiles to be merged into
  // an existing container IFF that container exists already.
  else if (/*srcPath.length == 0 ||*/ destParts.path.length == 0 && this.containerName != destParts.containerName) {
    if (destParts.path.length > 0 && destParts.path != '/') {
      //console.log(destParts);
      this.cxt.log("Copying container into subdir of another container.", "info");
      var err = new Error('Cannot copy a container into a subdirectory of another container.');
      err.status = 403;
      //fn(err);
      //return;
    }
    this.store.container(destParts.containerName, function (e, container) {
      // When we hit an error, we might be able to create a new
      // container.
      if (e) {
        // If the error is 404, we try to create a new container.
        if (e.statusCode == 404) {
          // Create a container and then copy.
          // The new container is private, and does not use CDN.
          var acl = new hpcloud.ObjectStorage.ACL();
          self.store.createContainer(destParts.containerName, acl, {}, function (e, data) {
            // Uh-oh. Can't create a container.
            if (e) {
              self.cxt.log("Failed to create container.", "warning");
              e.status = 403;
              fn(e);
              return;
              // Cyclomatic complexity sucks.
            }
            // If we get here, we've created a new container.
            self.withEachObjectIn(srcPath, self.containerName, _eachItem, _done);
          });
        }
        // If the error is not a 404, we die with a 403.
        else {
          self.cxt.log("Unknown error fetching container.", "warning");
          e.status = 403;
          fn(e);
          return;
        }
      }
      // If there is no error, container already exists. Straight copy.
      else {
        self.withEachObjectIn(srcPath, self.containerName, _eachItem, _done);
      }
    });
  }
  // If there is a parent item on the path, we have to make sure it
  // exists. Annoyingly, this adds another REST request.
  else if (parent != '/' && parent != '.') {
    var url = this.store.endpoint + '/' + encodeURI(destParts.containerName);
    var destContainer = new hpcloud.ObjectStorage.Container(destParts.containerName, this.store.token, url);
    destContainer._baseUrl = this.store.endpoint;
    this.cxt.log("Looking for parent directory %s in %s: copy", parent, destContainer.name(), "custom");
    destContainer.objectsWithPrefix(parent, '', function (e, list) {
      //console.log(list);
      if (e) {
        self.cxt.log("Error fetching parent directory before copy.", "debug");
        e.status = 409;
        fn(e);
        return;
      }
      else if (list.length == 0) {
        self.cxt.log("No parent %s directory found before copy.", parent, "debug");
        e = new Error("No directory found.");
        e.status = 409;
        fn(e);
        return;
      }
      else {
        self.withEachObjectIn(srcPath, self.containerName, _eachItem, _done);
      }
    })

  }
  // Deep copy of objects.
  else {
    this.withEachObjectIn(srcPath, this.containerName, _eachItem, _done);
    return;
  }
}
// Use the default implementation
//SwiftBridge.prototype.move = function (src, dest, overwrite, fn){
//}
SwiftBridge.prototype.saveProperties = function (resource, fn){
  var info = this.resourceToObject(resource);
  var path = this.pathTo(resource.name());
  var self = this;

  // Take advantage of a detail of the Swift API: Updating a container
  // is done with same operation as creating a container:
  if (path) {
    this.cxt.log("Fetch container %s: saveProperties", this.containerName, "custom");
    this.store.container(this.containerName, function (e, container) {
      if (e) {
        e.status = 409;
        fn(e);
        return;
      }
      self.cxt.log("Update object %s: saveProperties", info.name(), "custom");
      container.updateObjectMetadata(info, function (e) {
        self.cxt.log(info, "debug");
        if (e) {
          e.status = 403;
        }
        fn(e);
      });
    });
  }
  else {
    this.cxt.log("Create/update container %s: saveProperties", this.containerName, "custom");
    this.store.createContainer(name, null, info.metadata(), function (e, data) {
      fn(e);
    });
  }
}
SwiftBridge.prototype.fetchLock = function (resource, fn) {
  // In Swift, objects should already have their locks.
  fn(false, resource);
}
SwiftBridge.prototype.lock = function (resource, lock, fn) {
  if (!lock.isExclusive()) {
    var e = new Error("Only exclusive locks are allowed");
    e.status = 403;
    fn(e);
  }

  // FIXME: This supports only an exclusive lock.
  resource.setLocks([lock]);
  this.saveProperties(resource, fn);
}

SwiftBridge.prototype.unlock = function (resource, lock, fn) {
  // We remove any lock with the same ID, but leave any others. This
  // should facilitate shared locking, and will work fine w/o shared
  // locking support.
  var allLocks = resource.locks();
  var newLocks = [];
  for (var i = 0; i < allLocks.length; ++i) {
    var l = allLocks[i];
    if (l.token != lock.token) {
      this.cxt.log("Adding lock %j", l, "debug");
      newLocks.push(l);
    }
  }
  resource.setLocks(newLocks);
  this.saveProperties(resource, fn);
}

// ==================================================================
// INTERNAL
// ==================================================================

/**
 * Take a Resource and make an ObjectInfo object.
 *
 * @param {Resource} resource
 *   An existing resource.
 * @return {hpcloud.ObjectStorage.ObjectInfo}
 *   An object info.
 */
SwiftBridge.prototype.resourceToObject = function (resource) {
  var name = this.pathTo(resource.name());
  var o;
  if (resource.isCollection) {
    o = new hpcloud.ObjectStorage.ObjectInfo(name, 'application/directory');
  }
  else {
    o = new hpcloud.ObjectStorage.ObjectInfo(name, resource.contentType());
    o.setTransferEncoding(resource.contentEncoding());
    o.setETag(resource.etag());
    o.setContentLength(resource.length);
  }

  var metadata = {};

  // XXX: If the resource does not already have the properties that are
  // in Swift, they will be lost on write.
  var props = resource.properties();
  for(var i = 0; i < props.length; ++i) {
    var p = props[i];
    // Swift property: Store without NS.
    if (p.ns == SwiftBridge.XML_NS) {
      metadata[p.name] = p.value;
    }
    // WebDAV property: Prefix with NS.
    else {
      metadata[p.clarkName()] = p.value;
    }
  }

  // Set a lock, if one is passed. This allows stealing locks.
  var lock = resource.lock(0);
  if (lock) {
    metadata['exclusive-lock'] = SwiftUtils.encodeHeaderValue(lock, true);
  }
  o.setMetadata(metadata);
  o.setLastModified(resource.lastModified());

  return o;
}

/**
 * Parse a destination URI.
 *
 * The return value is an object:
 *
 * { projectId: 123, containerName: "foo", path: "/bar/baz" }
 *
 * @param {String} dest
 * @return {Object}
 */
SwiftBridge.prototype.parseDestinationURI = function (dest) {
  var parts = require('url').parse(dest);

  if (!parts || parts.length == 0) {
    return;
  }

  var pathList = parts.pathname.split('/');

  // If there was a leading slash, first value is empty.
  if (pathList.length > 0 && pathList[0].length == 0) {
    pathList.shift();
  }

  // If path is empty, give up.
  if (pathList.length == 0) {
    return;
  }

  var tenant = pathList.shift();

  var cname = pathList.length == 0 ? '' : pathList.shift();

  var path = pathList.join('/');

  // This might not be necessary.
  if (path.slice(-1) == '/') {
    path = path.slice(0, -1);
  }

  return {
    projectId: tenant,
    containerName: cname,
    path: path
  };
}


/**
 * Load an object, and correct for directory markers.
 *
 * The returned object may be a File or a Collection.
 *
 * @param {String} path
 *   The Swift name of the object.
 * @param {String} name
 *   The WebDAV name of the object.
 * @param {Container} container
 *   A container
 * @param {Function} fn
 *   Called fn(Error e, Resource r);
 */
SwiftBridge.prototype.loadObject = function (path, name, container, fn) {
  var self = this;
  this.cxt.log("Get remote object: loadObject.", "custom");
  container.remoteObject(path, function (e, obj) {
    if (e) {
      // If this looks like a Subdir, create a fake directory marker.
      // Subdirs can have some wonky side effects -- like the fact that
      // if all their children disappear, so do they. WebDAV provides no
      // way of accounting for this.
      //
      // FIXME: This will never match, because toPath() strips trailing
      // slashes.
      /*
      if(path.slice(-1) == '/') {
        self.loadSubdir(path, name, container, fn);
        return;
      }
      // Otherwise we assume it's a missing object.
      self.cxt.log("Error loading object: %s", e.message, "debug");
      e.status = 404;
      fn(e);
      */
      // STOPGAP. This has some unfortunate performance implications.
      self.cxt.log("Loading a subdir named %s", name, "debug");
      self.loadSubdir(path, name, container, fn);
      return;
    }

    var item = obj.info();

    var res;
    if (self.isDirectoryMarker(item)) {
      res = self.createCollection(name);
    }
    else {
      res = self.createFile(name);
      res.setReader(new BufferedReader(obj));
      res.setEtag('"' + item.eTag() + '"');
      res.setContentType(item.contentType());
      res.setLength(item.contentLength());
      try {
        // This will be set.
        res.setContentEncoding(item.transferEncoding());
      } catch (e) {
        self.cxt.log("Could not get transfer encoding.", "debug");
      }
    }
    res.setLastModified(item.lastModified());
    res.setCreationDate(item.lastModified());

    self._loadLock(res, item);
    self._loadProperties(res, item);


    fn(false, res);
  });
}

SwiftBridge.prototype._loadLock = function (resource, info) {
  var metadata = info.metadata();
  var now = Date.now();

  // Find locks:
  for (var md in metadata) {
    if (md == 'exclusive-lock') {
      var rawlock = SwiftUtils.decodeHeaderValue(metadata[md], true);
      if (rawlock) {
        var lock = Lock.reconstitute(rawlock);
        console.log(lock);
        // Only add valid locks.
        //if (lock.expires && lock.expires > now) {
        if (lock.isExpired()) {
          this.cxt.log("Not adding expired lock: %j (%s) %d", rawlock, metadata[md], now, "debug");
        }
        // Here's the deal: Locks are attached to resources, and there
        // is no easy way to scan a tree before or after a copy and
        // remove all the locks. So we do this lazily. Locks are simply
        // dropped off of objects when they are loaded. Then when they
        // are modified, the lock is deleted.
        else if (lock.root != resource.name()) {
          this.cxt.log("Not adding lock on %s to %s.", lock.root, resource.name(), "debug");
        }
        else {
          this.cxt.log("Found lock: %j (%s)", rawlock, metadata[md], "debug");
          resource.setLocks([lock]);
        }
      }
      break;
    }
  }
}

SwiftBridge.prototype._loadProperties = function (resource, info) {
  var metadata = info.metadata();
  var stoplist = {'exclusive-lock': 1, 'shared-lock': 1};
  var props = [];

  for (var md in metadata) {
    if (md in stoplist) {
      this.cxt.log("%s is not a property.", md, "debug");
      continue;
    }

    var key = decodeURI(md);
    var value = SwiftUtils.decodeHeaderValue(metadata[md]);
    var property;
    if (key.indexOf('{') == 0) {
      // Assume we have a clark name.
      var m = key.match(/^\{([^\}]+)\}(.*)$/);
      if (m.legth < 3) {
        this.cxt.log("Invalid property name found: %s. Ignoring.", key, "debug");
        continue;
      }
      property = new Property(m[1], m[2], value);
    }
    else {
      property = new Property(SwiftBridge.XML_NS, key, value);
    }
    this.cxt.log("Adding dead property %s = %s", property.clarkName(), property.value, "debug");
    props.push(property);
  }
  resource.setProperties(props);
}

/*
SwiftBridge.prototype.metadataToProperties = function (resource, info) {
  var metadata = info.metadata();
  var properties = [];
  for (item in metadata) {
    // See if it's a webdav property.
    var name = decodeURI(item);
    if (name.indexOf('webdav-') != 0) {
      continue;
    }

    var decoder = new StringDecoder('base64');
    var val = decoder.write(metadata[item]);
    if (val.length > 0) {
      var json = JSON.parse(val);
      var prop = new Property(json.namespace, json.name, json.value);

    }
  }
}

SwiftBridge.prototype.propertiesToMetadata = function (resource, info) {
  var properties = resource.properties;
  var metadata = [];
  for (var i = 0; i < properties.length; ++i) {
    var prop = properties[i];
    var pname = 'webdav-' + encodeUri(prop.clarkName());
    var pval = new Buffer(JSON.stringify(prop, 'base64'));
    metadata[pname] = pval;
  }
  
}
*/

/**
 * Load a subdir marker.
 *
 * Generally speaking, this is a helper function, but you can call it
 * directly if you need a subdir, but not a directory marker.
 *
 * This loads a subdir as a resource ONLY IF the subdir has contents.
 *
 * @param {String} path
 *   The Swift name of the object.
 * @param {String} name
 *   The WebDAV name of the object.
 * @param {Container} container
 *   A container
 * @param {Function} fn
 *   Called fn(Error e, Resource r);
 */
SwiftBridge.prototype.loadSubdir = function (path, name, container, fn) {
  var self = this;
  this.cxt.log("Check if subdir exists: loadSubdir.", "custom");
  container.objectsWithPrefix(path + '/', '/', function (e, list) {
    if (e || list.length == 0) {
      e.status = 404;
      fn(e);
      return;
    }
    else {
      var col = self._pseudoCollection(name, Date.now());

      // This indicates that it's not a directory marker.
      col.isSubdir = true; 

      fn(false, col);
      return;
    }
  });
}

/**
 * List all Tenants as if they were collections.
 *
 * @param {Function} fn
 *   Called as fn(Error e, Array list);
 */
SwiftBridge.prototype.listProjects = function (fn) {
  var is = new hpcloud.IdentityServices(this.endpoint);
  var self = this;
  this.cxt.log("Get tenants: listProjects.", "custom");
  is.tenants(this.identity, function (e, projects) {
    if (e) {
      fn(e);
      return;
    }
    var col = [];
    for (var i = 0; i < projects.length; ++i) {
      var proj = projects[i];
      if (!proj.enabled) {
        self.cxt.log("Project %s is marked disabled.", proj.id, 'debug');
        continue;
      }
      var res = self.createCollection('/' + proj.id + '/');
      res.setLastModified(Date.parse(proj.updated));
      res.setCreationDate(Date.parse(proj.created));

      // TODO: Can we set a display name property on this?

      col.push(res);
    }
    fn(false, col);
  });
}

/**
 * Given an internal path, build the full path.
 *
 * For a resource inside of a container (e.g. /foo/bar) this will return
 * the full path (/TENANT/CONTAINER/foo/bar). For a container
 * (/myContainer) this will return a tenant/container URL
 * (/TENANT/myContainer). This last piece is accomplished by
 * introspecting the client's URL.
 *
 * @param {String} path
 *   The local (Swift) path.
 * @return {String}
 *   The URL (WebDAV) path.
 */
SwiftBridge.prototype.uriTo = function (path) {
  /*
  if (path.indexOf('/') === 0) {
    path = path.substring(1);
  }
  */
  return Path.join(this.baseURI, path);
}

/**
 * Given a resource name, get the Swift path to the resource.
 *
 * That is, it converts between a full path (/TENANT/CONTAINER/foo/bar)
 * to a path relative to the container (/foo/bar)
 *
 * @param {String} resourceName
 *   The name of a resource.
 * @param {boolean} trailingSlash
 *   If TRUE, leave a trailing slash if present. By default, we strip
 *   off trailing slashes. But some operations (objectsWithPrefix)
 *   require the trailing slash.
 * @return {String}
 *   The relative path within a container.
 */
SwiftBridge.prototype.pathTo = function (resourceName, trailingSlash, baseURI) {
  var slash = trailingSlash || false;
  if (!baseURI) {
    baseURI = this.baseURI;
  }

  this.cxt.log("Adjusting %s relative to %s", resourceName, baseURI, "debug");
  if (resourceName.indexOf(this.baseURI) == 0) {
    var len = baseURI.length;
    resourceName = resourceName.substring(len);
  }

  if (!slash && resourceName.slice(-1) == '/') {
    this.cxt.log("Removing trailing slash.");
    resourceName = resourceName.slice(0, -1);
  }

  return resourceName;
}

/**
 * List containers as collections.
 *
 * @param {Function} fn
 *   Called fn(Error e, Array containers)
 */
SwiftBridge.prototype.listContainers = function (fn) {
  var self = this;
  this.cxt.log("Get containers: listContainers.", "custom");
  this.store.containers(function (e, list) {
    if (e) {
      self.cxt.log("ObjectStorage error on listing containers: %s", e.message, 'debug');
      e.status = 403;
      fn(e);
      return;
    }
    var cols = [];
    var now = Date.now();
    for (var i = 0; i < list.length; ++i) {
      var container = list[i];
      var res = self.createCollection(self.uriTo(container.name()));
      res.setLastModified(now);
      res.setCreationDate(now);

      cols.push(res);
    }
    fn(false, cols);
  });
}

/**
 * List resources in a collection.
 *
 * @param {Collection} collection
 * @param {boolean} deep
 * @param {Function} fn
 *   Called fn(Error e, Array listOfObjects)
 */
SwiftBridge.prototype.listObjects = function (collection, deep, fn) {
  var path = this.pathTo(collection.name());
  var self = this;

  if (path.length > 0) {
    path += '/';
  }

  // this.loadContainer(collection.name(), function (e, container) {
  this.loadContainer(this.containerName, function (e, container) {
    if (e) {
      fn(e);
      return;
    }
    var delimiter = deep? '' : '/';
    self.cxt.log("Looking for objects with prefix %s", path, "custom");
    container.objectsWithPrefix(path, delimiter, function (e, list) {
    //container.objectsByPath(path, delimiter, function (e, list) {
      if (e) {
        fn(e);
        e.status = 403;
        return;
      }
      self.unpackObjects(list, fn);
    });
  });
}

/**
 * Given a list of objects, create a list of resources.
 *
 * Swift has some special problems. One of them is the somewhat spurious
 * distinction between directory markers and subdirs, which in turn
 * leads to two distinct ways of querying for directory contents: by
 * prefix and by path.
 *
 * Now, since the WebDAV cannot enforce which method the user chooses
 * when the user operates outside of webdav, we have to support BOTH
 * directory-like structures. But this means we will sometimes get
 * duplicates. So we have to prune the dupicates manually, which just
 * plain sucks.
 *
 * This method will de-duplicate if the incoming list has both directory
 * markers (content-type: application/directory) and subdirs.
 *
 * @param {Array} list
 *   List of objects
 * @param {Function} fn
 *   Called fn(Error e, Array listOfObjects);
 */
SwiftBridge.prototype.unpackObjects = function (list, fn) {
  var contents = [];
  var now = Date.now();
  var map = {};
  for (var i = 0; i < list.length; ++i) {
    var item = list[i];
    var res;
    // this.cxt.log("Unpacking %j", item, 'debug');
    //if (item instanceof hpcloud.ObjectStorage.Subdir) {
    if (item.delimiter) {
      var name = item.name().slice(0, -1);
      res = this._pseudoCollection(this.uriTo(name), now);
      res.isSubdir = true;
      // Only add a subdir if the directory marker does not exist.
      if (!map[name]) {
        map[name] = res;
      }
    }
    else if (this.isDirectoryMarker(item)) {
      var name = item.name();
      res = this.createCollection(this.uriTo(name));
      res.setLastModified(Date.parse(item.lastModified()));
      res.setCreationDate(Date.parse(item.lastModified()));
      map[name] = res;
    }
    else {
      res = this.createFile(this.uriTo(item.name()));
      res.setLastModified(Date.parse(item.lastModified()));
      res.setCreationDate(Date.parse(item.lastModified()));
      res.setEtag('"' + item.eTag() + '"');
      res.setContentType(item.contentType());
      res.setLength(item.contentLength());
      try {
        // This might be a bad idea altogether.
        res.setContentEncoding(item.transferEncoding());
      } catch (e) {
        // THis is fairly common.
        //this.cxt.log("Could not get transfer encoding.", "debug");
      }
      map[res.name()] = res;
    }
    //contents.push(res);
  }

  // Convert map to array.
  for (var k in map) {
    contents.push(map[k]);
  }

  //console.log("CONTENTS: %j", contents);
  fn(false, contents);
}

/**
 * Check whether the item looks like a directory.
 *
 * This is nothing better than a guess, based on suggested best
 * practices from a few sources. There is no standard, though, for what
 * makes a directory marker a marker and not a file.
 *
 * XXX: Should we also check file size? At least hypothetically, a
 * directory marker should not have any contents.
 *
 * @param {ObjectInfo} item
 */
SwiftBridge.prototype.isDirectoryMarker = function (item) {
  var ctype = item.contentType();
  // Match x-application/directory and application/directory
  if (ctype && ctype.indexOf('application/directory') > -1) {
    return true;
  }

  return false;
}

/**
 * Fetch a container.
 *
 * XXX: This should be extended to support caching of containers.
 *
 * @param {String} containerName
 * @param {Function} fn
 *   Called: fn(Error e, Container c)
 */
SwiftBridge.prototype.loadContainer = function (containerName, fn) {
  // XXX: Add local caching here?
  this.cxt.log("Get container %s: loadContainer.", containerName, "custom");
  this.store.container(containerName, fn);
}

/**
 * Create a new container.
 *
 * ACL is set to private, no CDN activation is done.
 *
 * @param {Collection} collection
 * @param {Function} fn
 *   Called fn(Error e)
 */
SwiftBridge.prototype.mkContainer = function (collection, fn) {
  var self = this;
  var cname = this.containerName; //typeof collection == "string" ? collection : collection.name();
  //cname = this.pathTo(cname);
  this.store.container(cname, function (noContainer, container) {
    if (noContainer) {
      // Try to create a new collection.
      var acl = new hpcloud.ObjectStorage.ACL();
      self.store.createContainer(cname, acl, {}, function (e) {
        if (e) {
          e.status = 403;
        }
        fn(e);
      });
      return;
    }
    else {
      // If the collection does exist, we have an error condition.
      var err = new Error("Collection exists.");
      err.status = 405;
      fn(err);
      return;
    }
  });
}
/**
 * Make a new directory marker.
 */
SwiftBridge.prototype.mkDirectory = function (collection, fn) {
  var self = this;
  var cname = typeof collection == "string" ? collection : collection.name();
  cname = this.pathTo(cname);
  parent = Path.dirname(cname);
  this.cxt.log("load container: mkDirectory", "custom");
  this.store.container(this.containerName, function (noContainer, container) {
    // If there is no container, we refuse to create a subdirectory.
    if (noContainer) {
      noContainer.status = 409;
      fn(noContainer);
      return;
    }

    var marker = new hpcloud.ObjectStorage.ObjectInfo(cname, 'application/directory');

    if (parent != '/' && parent != '.') {
      // Here we are trying to see if a directory-like thing exists, and
      // this is a little complicated. We will get both subdir and
      // directory marker objects in the list. But this is okay, since
      // all we're really concerned with is whether there is some
      // directory-like thing.
      self.cxt.log("objects by prefix %s: mkDirectory", parent, "custom");
      container.objectsWithPrefix(parent, function (e, list) {

        // In either of the first cases we should not create a
        // directory.
        if (e) {
          e.status = 409;
          fn(e);
          return;
        }
        else if (list.length == 0) {
          var nope = new Error('Cannot create directory inside non-existent parent.');
          nope.status = 409;
          fn(nope);
          return;
        }

        // If we get here, we can try to create a directory.
        container.save(marker, '', function (e, r) {
          if (e) {
            e.status = 403;
          }
          fn(e);
          return;
        });
      });
    }
    else {
      // We're basically ignoring RFC-4918's requirement that we must
      // check that all parent directories exist before creating a
      // subdirectory (See 9.3.1). That would introduce a HUGE performance
      // penalty for deeply nested structures.
      container.save(marker, '', function (e, r) {
        if (e) {
          e.status = 403;
        }
        fn(e);
        return;
      });
    }
  });


}

/**
 * Fake a collection.
 */
SwiftBridge.prototype._pseudoCollection = function (name, time) {
  var col = this.createCollection(name);
  col.setLastModified(time);
  col.setCreationDate(time);

  return col;
}

/**
 * Iterates each item inside of a given source.
 *
 * This streamlines the process of loading a collection and then listing
 * its contents, then iterating the list. Pass a path, a collection
 * name, and a pair of functions, and this will load the collection and
 * iterate the directory listings.
 *
 * @param {String} path
 *   The path to the resource. This can be a file or a directory.
 * @param {String} containerName
 *   The name of the container.
 * @param {Function} eachItem
 *   Called as eachItem(item, container, callback). callback should be called as
 *   callback(Error e);
 * @param {Function} done
 *   Called as done(Error e, Container c);
 */
SwiftBridge.prototype.withEachObjectIn = function (path, containerName, eachItem, done) {
  var self = this;
  this.cxt.log("Get the container %s: withEachObjectIn", containerName, "custom");
  this.store.container(containerName, function (e, container) {
    if (e) {
      e.status = 404;
      done(e);
      return;
    }
    // What we do here is delete everything that shares the given
    // prefix. This will include directory markers, "subdir" virtual
    // objects (which don't really get deleted), and any other kind of
    // object.
    self.cxt.log("get all objects in %s: withEachObjectIn", path, "custom");
    // We need the trailing slash to prevent path 'test' from matching
    // 'test1'. prefix does not include a boundary.
    container.objectsWithPrefix(path + '/', function (e, list) {
      if (e) {
        e.status = (e.statusCode && e.statusCode == 404)? 404: 403;
        done(e);
        return;
      }
      async.forEach(list, function (e, c) { eachItem(e, container, c); }, function (e) { done(e, container); });
    });
  });
}

