/**
 * File system bridge.
 */

var fs = require('fs');
var util = require('util');
var crypto = require('crypto');
var Path = require('path');

var BufferedReader = require('pronto').streams.BufferedReader
var ResourceBridge = require('../resourcebridge');
var Collection = require('../collection');
var File = require('../file');
var HTTPUtils = require('../http/util');

function FSBridge(documentRoot, baseURI, cxt) {
  this.documentRoot = documentRoot;
  //this.parsedUrl = parsedUrl;
  this.baseURI = baseURI;
  this.cxt = cxt;
}
util.inherits(FSBridge, ResourceBridge);
module.exports = FSBridge;

/**
 * Default mode.
 */
FSBridge.DEFAULT_MODE = 0755;

FSBridge.prototype.load = function (resourceName, fn) {
  var name = this.pathTo(resourceName);
  //console.log("Loading %s", name);
  fs.stat(name, function (e, stat) {
    if (e) {
      switch (e.code) {
        // 34: NOENT, no such file
        // Current strategy is to return empty (undefined) data,
        // which all implementors seem to handle. This will result
        // in a 404 for GET, while others assume this means no such
        // resource.
        case 'ENOENT':
          e.status = 404;
          break;
        // EACCESS, not allowed
        // This indicates that the current user has no READ permission
        // on the file, or no execute perm on a directory. We liken this
        // to a 403.
        case 'EACCES':
          e.status = 403;
          break;
        // All other errors are deemed "internal" and will result in a
        // 500.
        default:
          e.status = 500;
          break;
      }
      fn(e);
      return;
    }
    if (stat.isFile()) {
      var file = new File(resourceName);
      file.setLastModified(Date.parse(stat.mtime));
      file.setCreationDate(Date.parse(stat.ctime));
      file.setLength(stat.size);
      file.setReader(new BufferedReader(fs.createReadStream(name)));
      // file.setReader(function (fun) {var stream = fs.createReadStream(name); fun(false, stream);});
      fn(false, file);
    }
    else if (stat.isDirectory()) {
      var col = new Collection(resourceName);
      col.setLastModified(Date.parse(stat.mtime));
      col.setCreationDate(Date.parse(stat.ctime));
      fn(false, col);
    }
    else {
      fn(new Error("Unsupported file type for " + name));
      return;
    }
  });
}
FSBridge.prototype.save = function (resource, stream, fn) {
  // 1. Create a listener to build the eTag
  var digest = crypto.createHash('md5');
  var md5;

  stream.on('data', function (data) {
    digest.update(data);
  });
  stream.on('end', function () {
    md5 = '"' + digest.digest('hex'); + '"';
    // 5. Return save data.
    fn(false, {etag: md5, date: Date.now()});
  });

  // 2. Open the output file
  var path = this.pathTo(resource.name());
  // Note that we clobber the file.
  var out = fs.createWriteStream(path, {
    flags: 'w',
    mode: FSBridge.DEFAULT_MODE
  });

  // 3. set up the data pipe
  stream.pipe(out);
  // 4. resume the stream
  stream.resume();
}

FSBridge.prototype.listContents = function (collection, shallow, fn) {
  if (typeof shallow == 'function') {
    fn = shallow;
    shallow = true;
  }
  var uri = (typeof collection == 'string') ? collection : collection.name();
  var path = this.pathTo(uri);

  var self = this;
  FSBridge.ls(path, shallow, function (e, paths) {
    self._loadResources(paths, [], fn);
  });
}

FSBridge.prototype.mkcol = function (collection, fn) {
  var uri = (typeof collection == 'string') ? collection : collection.name();
  var path = this.pathTo(uri);
  //console.log("path: %s", path);
  fs.mkdir(path, FSBridge.DEFAULT_MODE, function (e) {
    // Convert POSIX errors to HTTP status codes.
    if (e) {
      switch (e.code) {
        case 'EACCES':
        case 'EPERM':
        case 'EROFS':
          e.status = 403;
          break;
        case 'EEXIST':
          e.status = 405
          break;
        case 'EFAULT':
        case 'ENOTDIR':
        case 'ENOENT': // Here this indicates parent is missing.
          e.status = 409;
          break;
        case 'ENOMEM':
        case 'ENOSPC':
          e.status = 507;
          break;
        default:
          e.status = 500;
          break;
      }
    }
    fn(e);
  });
}

FSBridge.prototype.deleteCollection = function (collection, fn) {
  var path = this.pathTo(collection.name());
  var cmd = this;
  
  FSBridge.rrmdir(path, function (e, failures) {
    // Adjust to URI path.
    for (var i = 0; i < failures.length; ++i) {
      failures.href = cmd.uriTo(failures.path);
    }
    // Translate POSIX codes to HTTP status.
    if (e) {
      switch (e.code) {
        case 'EACCES':
        case 'EPERM':
        case 'EROFS':
          e.status = 403;
          break;
        case 'EBUSY':
        case 'ENOTEMPTY':
          e.status = 424;
          break;
        case 'ENOENT':
          e.status = 404;
          break;
        default:
          e.status = 500;
          break;
      }
      // failures SHOULD be empty in this case.
      fn(e, failures);
    }
    fn(false, failures);

  });
}

FSBridge.prototype.deleteFile = function (resource, fn) {
  var path = this.pathTo(resource.name());
  //console.log("Deleting %s", path);

  fs.unlink(path, function (e) {
    // Convert POSIX codes to HTTP status.
    if (e) {
      switch (e.code) {
        case 'EACCES':
        case 'EPERM':
        case 'EROFS':
          e.status = 403;
          break;
        case 'ENOENT':
          e.status = 404;
          break;
        default:
          e.status = 500;
          break;
      }
      fn(e);
      return;
    }
    // true indicates that there is no multi-status.
    fn(false, resource.name());
  });
}

FSBridge.prototype.copy = function (src, dest, overwrite, fn) {
  var srcPath = this.pathTo(src.name());
  var destPath = this.pathTo(dest);
  var self = this;

  function _adjustMultistatus (e, ms) {
    if (ms) {
      //console.log('Adjusting mulitstatus');
      for (var i = 0; i < ms.length; ++i) {
        ms[i].path = self.uriTo(ms[i].path);
      }
    }
    fn(e, ms);
  }

  /**
   * Check whether we can overwrite an existing file.
   */
  function _overwriteCheck(cb) {
    if (overwrite) {
      cb(srcPath, destPath, fn);
    }
    else {
      fs.stat(destPath, function (e, stat) {
        if (e) {
          // ENOENT means the file/dir does not yet exist. This is okay.
          if (e.code == 'ENOENT') {
           // We are good to go.
           cb(srcPath, destPath, _adjustMultistatus);
           return;
          }
          else {
            e.status = 403;
            fn(e);
            return;
          }
        }
        var error = new Error('Destination exists.');
        error.status = 412; // Precondition failed.
        fn(error);
      });
    }
  }

  // Do the check and call the appropriate Copy method.
  _overwriteCheck(function (srcPath, destPath, fn) {
    if (src.isCollection) {
      FSBridge.rcopydir(srcPath, destPath, _adjustMultistatus);
      //fn(new Error('Not implemented'));
      return;
    }
    FSBridge.copyFile(srcPath, destPath, fn);
  });

}

/**
 * Take a URI path and generate a filesystem path.
 */
FSBridge.prototype.pathTo = function (name) {
  return this.documentRoot + this.normalize(name);
}

/**
 * Take a filesystem path and generate a URI path.
 */
FSBridge.prototype.uriTo = function (path) {
  if (path.indexOf(this.documentRoot) == -1) {
    return path;
  }

  var out = this.baseURI + path.substring(this.documentRoot.length);
  return out;

}

FSBridge.prototype.normalize = function (path) {
  // XXX: Do we normalize the trailing slash off of
  // the name?
  return Path.normalize(path).replace(/\/$/, '');
}

FSBridge.copyFile = function (src, dest, cb) {
  var is = fs.createReadStream(src);
  var os = fs.createWriteStream(dest, { mode: FSBridge.DEFAULT_MODE });
  is.pipe(os);
  is.on('end', function () {
    cb(false);
  }); 
  is.on('error', function (e) {
    // console.log('OH NOES: %s', e.message);
    cb(e);
  });
  os.on('error', function (e) {
    // ENOENT indicates that there is no parent directory to write to,
    // so we fail with 409. Otherwise, we assume permissions-ish issue.
    // (Really, there is the option to 500, but...)
    e.status = e.code == 'ENOENT' ? 409 : 403;
    cb(e);
  });
}

/**
 * An internal function for loading an array of resources.
 *
 * This is recursive.
 *
 * @param {Array} paths
 *   A list of paths.
 * @param {Array} resources
 *   A list of resources. This will be populated as the function runs.
 *   Initialize this with an empty array of you're not sure what to do.
 * @param {Function} done
 *   A callback, called as fn(Error e, Array resources).
 */
FSBridge.prototype._loadResources = function (paths, resources, done) {
  if (paths.length == 0) {
    done(false, resources);
  }

  var head = paths.shift();
  var self = this;
  fs.stat(head, function (e, stats) {
    // XXX: This seems heavy handed. But there's no clear alternative in
    // the standard. If it's just an access violation, though, we put it
    // in.
    if (e) {
      if (e.code != 'ENOACCES') {
        e.status = 500;
        done(e);
        return;
      }
      var empty = self.createFile(self.uriTo(head));
      resources.push(empty);
      self._loadResources(paths, resources, done);
      return;
    }

    var res;
    if (stats.isDirectory()) {
      res = self.createCollection(self.uriTo(head));
    }
    else if (stats.isFile()) {
      res = self.createFile(self.uriTo(head));
      res.setLength(stats.size);
      res.setContentType(HTTPUtils.guessContentType(head, res));
      res.setContentEncoding(HTTPUtils.guessContentEncoding(head));

      // FIXME: This is really a horrid idea. Basically, we generate
      // an MD5 only if the file is less than a meg. Otherwise we have
      // to read the entire file, which is slow. But is that better
      // than skipping the etag?
      if (size < 1024 * 1024) {
        res.setEtag(FSBridge.etagSync(head));
      }
    }
    else {
      var err = new Error('Cannot handle this inode type.');
      err.status = 500;
      done(e);
      return;
    }

    res.setLastModified(Date.parse(stats.mtime));
    res.setCreationDate(Date.parse(stats.ctime));
    // Recurse.
    self._loadResources(paths, resources, done);
  });
}
/**
 * Recursive copy.
 *
 * @param {String} src
 *   The source directory.
 * @param {String} dest
 *   The desitnation name.
 * @param {Function} fn
 *   The callback, receives fn(Error e, Array status).
 */
FSBridge.rcopydir = function (src, dest, fn) {
  fs.readdir(src, function (e, contents) {
    if (e) {
      fn(e, []);
      return;
    }

    var newPaths = [];
    for(var i = 0; i < contents.length; ++i) {
      newPaths.push(src + '/' + contents[i]);
    }

    _listAllFiles(newPaths, [src], function (e, srcs) {
        if (e) {
          fn(e);
          //console.log(e);
          return;
        }

        dests = [];
        for (var j = 0; j < srcs.length; ++j) {
          var d = dest + srcs[j].substring(srcs[0].length);
          dests.push(d);
        }

        _copydir(srcs, dests, fn, []);
      });
  });
}

/**
 * Recursive rmdir.
 *
 * This recursively removes all of the files in a directory. It attempts
 * to minimize errors by first building up a list of all files, and
 * running some basic tests on them. Still, it is not designed to
 * robustly handle all error cases.
 *
 * If an error is encountered during the build phase, the rmdir is
 * aborted, given the theory that consistent state is better than
 * partial deletion.
 *
 * If an error is encountered during deletion, we try to delete as much
 * as possible, given the theory that if we're in process, we might as
 * well get as far as possible.
 *
 * @param {String} dir
 *   The name of the directory to delete.
 * @param {Function} fn
 *   The callback function, which will receive
 *   fn(Error e, Array deletedNames);
 */
FSBridge.rrmdir = function (dir, fn) {
  fs.readdir(dir, function (e, contents) {
    if (e) {
      fn(e, []);
      return;
    }

    var newPaths = [];
    for(var i = 0; i < contents.length; ++i) {
      newPaths.push(dir + '/' + contents[i]);
    }

    _listAllFiles(newPaths, [dir], function (e, toDelete) {
        if (e) {
          fn(e);
          //console.log(e);
          return;
        }
        _rrmdir(toDelete, fn, []);
      });
  });
}

/**
 * List the contents of a directory.
 *
 * If shallow is true, list all descendants, otherwise list
 * immediate children.
 *
 * This calls fn(Error e, Array paths).
 */
FSBridge.ls = function (dir, shallow, fn) {
  fs.readdir(dir, function (e, contents) {
    if (e) {
      fn(e, []);
      return;
    }

    var newPaths = [];
    for(var i = 0; i < contents.length; ++i) {
      newPaths.push(dir + '/' + contents[i]);
    }

    _listAllFiles(newPaths, [dir], shallow, function (e, paths) {
      fn(e, paths);
    });
  });

}

/**
 * Recursively build a file list.
 *
 * This will traverse a directory listing (Array _in) and add the
 * contents of any found directory into the _out array. At the end, this
 * will call done(Error e, Array fullList), which will have all of the
 * files in depth-first order, directories appearing before their
 * contents.
 *
 * You can delete by tail iteration, or copy with head iteration.
 */
function _listAllFiles(_in, _out, shallow, done) {

  // Shallow defaults to false, since it is most common for copy, move,
  // delete. Only ls does a shallow listing.
  if (typeof shallow == 'function') {
    done = shallow;
    shallow = false;
  }

  if (_in.length == 0) {
    done(false, _out);
    return;
  }

  var head = _in.shift();

  fs.stat(head, function (e, stat) {
    // If we can't stat, we stop the operation.
    if (e) {
      done(e, []);
      return;
    }

    // If we get here, we can push this into the
    // processing queue.
    _out.push(head);

    // If it's a directory, we need to queue up the contents, too.
    if (shallow && stat.isDirectory()) {
      // console.log('Directory %s', head);
      fs.readdir(head, function (e, contents) {
        var newPaths = [];
        for(var i = 0; i < contents.length; ++i) {
          newPaths.push(head + '/' + contents[i]);
        }
        _listAllFiles(newPaths.concat(_in), _out, done);
      });
    }
    else {
      // console.log('File %s', head);
      _listAllFiles(_in, _out, done);
    }
  });
}

function _rrmdir(list, callback, failures) {
  if (list.length == 0) {
    callback(false, failures);
    return;
  }

  var deleteMe = list.pop();
  fs.stat(deleteMe, function (e, stat) {
    if (stat.isDirectory()) {
      // console.log("Rmdir %s", deleteMe);
      fs.rmdir(deleteMe, function (e) {
        if (e) {
          failures.push({path: deleteMe, status: 403});
        }
        _rrmdir(list, callback, failures);
      });
    }
    else {
      // console.log("Unlink %s", deleteMe);
      fs.unlink(deleteMe, function (e) {
        if (e) {
          failures.push({path: deleteMe, status: 403});
        }
        _rrmdir(list, callback, failures);
      });
    }
  });
}

/**
 * Copy items one by one in order.
 */
function _copydir(srcList, destList, callback, failures) {
  //console.log(srcList);
  //console.log(destList);
  //callback(new Error('FOO'), []);
  //return;

  // Done.
  if (srcList.length == 0) {
    callback(false, failures);
    return;
  }

  // Progress through the list heads.
  var headSrc = srcList.shift();
  var headDest = destList.shift();
  fs.stat(headSrc, function (e, stat) {
    if (e) {
      callback(e, []);
      return;
    }

    if (stat.isDirectory()) {
      // If it's a directory, mkdir.
      // FIXME: Adjust the Stat mode and use that.
      fs.mkdir(headDest, FSBridge.DEFAULT_MODE, function (e) {
        if (e) {
          // This is a problem. It's likely to kick off a whole stream
          // of errors. But the spec suggests that we shut up and move
          // along anyway.
          //if (e.code == 'ENOENT') {
          //  console.log('Could not create a directory.');
          //}
          e.status = e.code == 'ENOENT' ? 409 : 403;
          failures.push({path: headDest + '/', status: e.status});
        }
        _copydir(srcList, destList, callback, failures);
      });

    }
    else {
      // If it's a file, copy it.
      FSBridge.copyFile(headSrc, headDest, function (e) {
        if (e) {
          e.status = e.code == 'ENOENT' ? 409 : 403;
          failures.push({path: headDest, status: 403});
        }
        _copydir(srcList, destList, callback, failures);
      });

    }

  });
}

FSBridge.etagSync = function (file) {
  // This is a horrible idea.
  var digest = crypto.createHash('md5');
  var contents = readFileSync(file);
  digest.update(contents);
  return '"' + digest.digest('hex') + '"';
}

