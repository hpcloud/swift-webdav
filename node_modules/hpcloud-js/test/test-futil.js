var Futil = require('../lib/futil');
var assert = require('assert');

function testGetFn(first, second, third, fourth) {

  var a = Futil.argsWithFn(arguments, ['first','second', 'third', 'fourth']);

  //console.log("First: %s, Second, %s, Third: %s, Fourth: %s", a.first, a.second, a.third, a.fourth);

  var fn = a.fourth;
  fn();

  return a;

}

var res = testGetFn('a', 'b', 'c', function (){});
assert.equal('a', res.first);
assert.equal('b', res.second);
assert.equal('c', res.third);

assert.ok(typeof res.fourth == 'function');


res = testGetFn('a', 'b', function (){});
assert.equal('a', res.first);
assert.equal('b', res.second);
assert.ok(res.third == undefined);

assert.ok(typeof res.fourth == 'function');

// Test with misplaced trailing arg.
res = testGetFn('a', 'b', function (){}, 'd');
assert.equal('a', res.first);
assert.equal('b', res.second);
assert.ok(res.third == undefined);

assert.ok(typeof res.fourth == 'function');

// Test with only one arg.
res = testGetFn(function(){});
assert.ok(res.first == undefined);
assert.ok(res.second == undefined);
assert.ok(res.third == undefined);

assert.ok(typeof res.fourth == 'function');

// Test with two functions
res = testGetFn(function(){console.log('FAILED')}, null, null, function(){});
assert.ok(typeof res.first == 'function');
assert.ok(res.second == undefined);
assert.ok(res.third == undefined);

assert.ok(typeof res.fourth == 'function');


