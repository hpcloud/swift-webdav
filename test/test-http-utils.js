var U = require('../lib/http/util');
var File = require('../lib/file');
var assert = require('assert');

var START = Date.now();


// checkPreconditions()

// Canary
var request = {
  method: 'GET',
  headers: {}
}
var file = new File('/some/fake/path');
file.setLastModified(START);
file.setEtag('"9a324ade355b4fafa745151db89a84a9"');

assert.equal(200, U.checkPreconditions(request, file));

// Test If-Modified-Since
request = {
  method: 'GET',
  headers: {
    'if-modified-since': 'Sat, 29 Oct 1994 19:43:31 GMT'
  }
}
assert.equal(200, U.checkPreconditions(request, file));
request = {
  method: 'GET',
  headers: {
    'if-modified-since': 'Sat, 29 Oct 2104 19:43:31 GMT'
  }
}
assert.equal(304, U.checkPreconditions(request, file));
request = {
  method: 'DELETE',
  headers: {
    'if-modified-since': 'Sat, 29 Oct 2104 19:43:31 GMT'
  }
}
assert.equal(304, U.checkPreconditions(request, file));

// Test If-Unmodified-Since
request = {
  method: 'GET',
  headers: {
    'if-unmodified-since': 'Sat, 29 Oct 1994 19:43:31 GMT'
  }
}
assert.equal(412, U.checkPreconditions(request, file));
request = {
  method: 'GET',
  headers: {
    'if-unmodified-since': 'Sat, 29 Oct 2104 19:43:31 GMT'
  }
}
assert.equal(200, U.checkPreconditions(request, file));

// Test If-Match
request = {
  method: 'GET',
  headers: {
    'if-match': '*'
  }
}
assert.equal(200, U.checkPreconditions(request, file));
request = {
  method: 'GET',
  headers: {
    'if-match': '"9a324ade355b4fafa745151db89a84a9", "abcdefg"'
  }
}
assert.equal(200, U.checkPreconditions(request, file));

request = {
  method: 'GET',
  headers: {
    'if-match': '"9ccccccccccccccccccccccccccccccc", "abcdefg"'
  }
}
assert.equal(412, U.checkPreconditions(request, file));


// Test If-None-Match
request = {
  method: 'DELETE',
  headers: {
    'if-none-match': '*'
  }
}
assert.equal(412, U.checkPreconditions(request, file));
request = {
  method: 'GET',
  headers: {
    'if-none-match': '"9a324ade355b4fafa745151db89a84a9", "abcdefg"'
  }
}
assert.equal(304, U.checkPreconditions(request, file));

request = {
  method: 'POST',
  headers: {
    'if-none-match': '"9a324ade355b4fafa745151db89a84a9", "abcdefg"'
  }
}
assert.equal(412, U.checkPreconditions(request, file));

request = {
  method: 'POST',
  headers: {
    'if-none-match': '"9ccccccccccccccccccccccccccccccc", "abcdefg"'
  }
}
assert.equal(200, U.checkPreconditions(request, file));
