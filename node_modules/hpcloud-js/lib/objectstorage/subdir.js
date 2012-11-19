module.exports = Subdir;
function Subdir(path, delimiter) {
  this._path = path;
  this._delimiter = delimiter;
}

/**
 * This is for a degree of transparency between Subdir and ObjectInfo objects.
 */
Subdir.prototype.name = function () {
  return this._path;
}
/**
 * Alias of name().
 */
Subdir.prototype.path = Subdir.prototype.name;
Subdir.prototype.delimiter = function () {
  return this._delimiter;
}
