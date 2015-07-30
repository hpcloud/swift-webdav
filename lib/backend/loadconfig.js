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

