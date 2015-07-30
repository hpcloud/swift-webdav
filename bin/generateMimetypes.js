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
var fs = require('fs');

var MIME_TYPES= '/etc/mime.types';

var stat = fs.statSync(MIME_TYPES);

if (!stat) {
  console.error('No /etc/mime.types file found. Nothing to do.');
  exit;
}

var file = fs.readFileSync(MIME_TYPES, 'utf8');
var lines = file.split("\n");
var re = /([\.\-\/\+a-zA-Z0-9]+)\s+([%~a-zA-z0-9\s]+)/;
var map = {};

for (var i = 0; i < lines.length; ++i) {
  if (lines[i].length == 0 || lines[i].indexOf('#') === 0) {
    continue;
  }
  var tuple = lines[i].match(re);
  if (tuple && tuple.length > 2) {
    var exts = tuple[2].split(' ');
    for (var j = 0; j < exts.length; ++j) {
      map[exts[j]] = tuple[1];
    }
  }
}
console.log('module.exports = ' + JSON.stringify(map, null, " "));
