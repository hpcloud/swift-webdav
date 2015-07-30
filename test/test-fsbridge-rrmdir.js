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
