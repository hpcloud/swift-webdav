/**
 * A Resource is the basic WebDAV data type.
 *
 * There are two types of resources:
 * - A Collection
 * - A  File, which is a Resource that is not a collection. ;-)
 *
 * Every resource has a name, which is a path-like structure. Resources
 * may also have modification dates, though this is seldom used on
 * collections.
 */
function Resource(path) {
  this.path = path;
  this.props = [];
}
module.exports = Resource;

/**
 * Used to identify whether this is a collection or a file.
 */
Resource.prototype.isCollection = false;

// ==================================================================
// Concrete methods
// ==================================================================
Resource.prototype.name = function () {
  return this.path;
}
Resource.prototype.setName = function (name) {
  this.path = name;
}
Resource.prototype.lastModified = function () {
  return this.modified;
}
Resource.prototype.setLastModified = function (time) {
  this.modified = time;
}
Resource.prototype.creationDate = function () {
  return this.createdOn;
}
Resource.prototype.setCreationDate = function (time) {
  this.createdOn = time;
}

Resource.prototype.setProperties = function (props) {
  this.props = props;
}

Resource.prototype.setLocks = function (lock) {
  this._locks = lock;
}

Resource.prototype.locks = function () {
  return this._locks;
}

/**
 * Name/value property pairs.
 *
 * WebDAV allows arbitrary name/value pairs to be added to a resource.
 * This returns an array of all of the pairs.
 *
 * @param {Object} propertyDict
 *   If this is set, only the named properties will be returned.
 *   The dict is an object where the names (keys) are Clark names and
 *   the value is a Property object. This lends toward faster iteration.
 */
Resource.prototype.properties = function (propertyDict) {
  var props = this.props || [];
  var map = Resource.propertyMap(props);

  // Filter if necessary.
  if (propertyDict) {
    // This is ugly because properties are stored non-optimally.
    var found = [];
    for (var cname in propertyDict) {
      var p;
      if (map[cname]) {
        p = map[cname];
        p.status = 200;
      }
      else {
        p = propertyDict[cname];
        p.status = 404;
      }
      found.push(p);
    }
    return found;
  }


  // If no filter, return all properties.
  return props;
}
/**
 * Transform a list of properties to a map.
 *
 * The property's clark name is the key, and the Property is the value.
 */
Resource.propertyMap = function (properties) {
  var cnames = {};
  for (var i = 0; i < properties.length; ++i) {
    cnames[properties[i].clarkName()] = properties[i];
  }
  return cnames;
}
