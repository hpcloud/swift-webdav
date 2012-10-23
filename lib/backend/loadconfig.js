var pronto = require('pronto');
var fs = require('fs');
module.exports = LoadConfig;

/**
 * This command loads a JSON file.
 *
 * It does LIMITED comment stripping. Lines beginning with `//` will
 * be removed.
 *
 * <code>
 * {
 *   // This will be removed
 *   "foo": "bar" // This comment will cause an error.
 * }
 * </code>
 */
function LoadConfig () {
}
pronto.inheritsCommand(LoadConfig);

LoadConfig.COMMENT_REGEX = /^\s*\/\/.*\r?\n/mg;

/**
 * Utility for stripping comments and then loading JSON.
 *
 * This can be called all by itself, without any pronto stuff.
 *
 * @param {String} data
 *   The JSON string. Lines that start with `//` will be stripped.
 * @return {Object}
 *   JSON data.
 */
LoadConfig.parseCommentedJSON = function (data) {
  data = data.replace(LoadConfig.COMMENT_REGEX, '');
  return JSON.parse(data);
}
/**
 * Utility for loading a commented JSON file.
 */
LoadConfig.loadFileSync = function (file) {
  var data = fs.readFileSync(file, 'utf8');
  return LoadConfig.parseCommentedJSON(data);
}

LoadConfig.prototype.execute = function (cxt, params) {
  this.required(params, ['file']);
  var cmd = this;

  fs.readFile(params.file, 'utf8', function (e, data) {
    if (e) {
      cmd.error(e);
      return;
    }
    var json = LoadConfig.parseCommentedJSON(data);
    cmd.done(json);
  });
}

