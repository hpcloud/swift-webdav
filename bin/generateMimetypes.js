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
