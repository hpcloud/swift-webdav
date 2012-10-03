var webdavfs = require('../lib/fs');
var fs = require('fs');

var bridge = webdavfs.FSBridge;

fs.mkdirSync('./fsbridgetest');
fs.mkdirSync('./fsbridgetest/a');
fs.mkdirSync('./fsbridgetest/a/b');
fs.mkdirSync('./fsbridgetest/a/bb');
fs.mkdirSync('./fsbridgetest/a/b/c');


for (var i = 0; i < 10; ++i) {
  fs.writeFileSync('./fsbridgetest/a/b/foo-' + i, 'test', 'utf8');
  fs.writeFileSync('./fsbridgetest/a/bb/foo-' + i, 'test', 'utf8');
  fs.writeFileSync('./fsbridgetest/a/b/c/foo-' + i, 'test', 'utf8');
}

bridge.rrmdir('./fsbridgetest', function (e) {
  if (e) {
    console.log("Sad panda");
    return;
  }
  console.log('Happy, happy, joy, joy.');
});
