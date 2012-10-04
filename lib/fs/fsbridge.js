/**
 * File system bridge.
 */

var fs = require('fs');
var util = require('util');
var crypto = require('crypto');
var ResourceBridge = require('../resourcebridge');
var Collection = require('../collection');
var File = require('../file');
var BufferedReader = require('pronto').streams.BufferedReader

function FSBridge(documentRoot, parsedUrl) {
  this.documentRoot = documentRoot;
  this.parsedUrl = parsedUrl;
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
      file.setLength(stat.size);
      file.setReader(new BufferedReader(fs.createReadStream(name)));
      // file.setReader(function (fun) {var stream = fs.createReadStream(name); fun(false, stream);});
      fn(false, file);
    }
    else if (stat.isDirectory()) {
      var col = new Collection(resourceName);
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

FSBridge.prototype.copy = function (src, dest, fn) {
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
  if (name.indexOf(this.documentRoot) == -1) {
    return name;
  }

  var out = name.substring(0, this.documentRoot.length);
  return out;

}

FSBridge.prototype.normalize = function (path) {
  // XXX: Do we normalize the trailing slash off of
  // the name?
  return path;
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

function _listAllFiles(_in, _out, done) {

  if (_in.length == 0) {
    done(false, _out);
    return;
  }

  var head = _in.shift();

  fs.stat(head, function (e, stat) {
    // If we can't stat, we stop the delete.
    if (e) {
      done(e, []);
      return;
    }

    // If we get here, we can push this into the
    // processing queue.
    _out.push(head);

    // If it's a directory, we need to queue up the contents, too.
    if (stat.isDirectory()) {
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
