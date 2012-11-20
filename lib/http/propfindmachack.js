var pronto = require('pronto');
var Path = require('path');
/**
 * A hack to skip all of those files a Mac asks for.
 *
 * This just automatically returns a 404 for specific file patterns that
 * a Mac asks for.
 */
function PropfindMacHack(){}
pronto.inheritsCommand(PropfindMacHack);
module.exports = PropfindMacHack;

PropfindMacHack.prototype.execute = function (cxt, params) {
  var request = cxt.datasource('request');
  var fullpath = request.parsedUrl.pathname;
  var basename = Path.basename(fullpath);
  var skipFiles = {
    '/Volumes': true,
    '/.git': true,
    '/objects': true,
    '/refs': true,
    '/HEAD': true,
    '/.Trashes': true,
    '/.TemporaryItems':true,

    '/.ql_disablethumbnails': true
  };

  cxt.log("Testing path %s", basename, "debug");

  if (fullpath in skipFiles) {
    cxt.log("The path %s is on the skipfiles list.", fullpath, "info");
  }

  if (basename.indexOf('._') == 0) {
    cxt.log("Skipping hidden metadata file.", "info");
    this.reroute('@404', cxt);
    return;
  }

  this.done();
  return;

  /*
  var skiplist = [
    //'.DS_Store',
    '._.',
      '._.DS_Store'
  ];

  if (!path) {
    this.done();
  }

  if (basename in skiplist) {
    this.reroute('@404', cxt);
  }
 */

}
