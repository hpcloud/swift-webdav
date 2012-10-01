var U = require('../lib/http/util');
var File = require('../lib/file');
var assert = require('assert');

var START = Date.now();

// guessMimeType

assert.equal('application/x-octet-stream', U.guessContentType('foo/bar'));
assert.equal('application/x-octet-stream', U.guessContentType('foo/bar.nosuchextension'));
assert.equal('text/html', U.guessContentType('foo.html'));
assert.equal('text/html', U.guessContentType('/buz/buzz/foo.htm'));
assert.equal('text/plain', U.guessContentType('/buz/buzz/foo.txt'));
assert.equal('text/plain', U.guessContentType('/buz/buzz/foo.mdown'));
assert.equal('text/plain', U.guessContentType('/buz/buzz/foo.txt.bz2'));
assert.equal('text/plain', U.guessContentType('/buz/buzz/foo.txt.bz2.gz.gzip.zip.bz'));
assert.equal('application/x-msdos-program', U.guessContentType('bz/buzz/foo.exe'));
assert.equal('application/vnd.openxmlformats-officedocument.presentationml.presentation', U.guessContentType('bz/buzz/foo.pptx'));

// Guess content type
assert.equal('bzip2', U.guessContentEncoding('/buz/buzz/foo.txt.bz2'));
assert.equal('gzip', U.guessContentEncoding('/buz/buzz/foo.txt.bz2.gz.gzip'));
assert.equal('deflate', U.guessContentEncoding('/buz/buzz/foo.txt.zip'));

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
