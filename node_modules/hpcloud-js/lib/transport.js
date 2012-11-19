/*!
 *
 */
HTTPS = require('https');
crypto = require('crypto');
Futil = require('./futil');

module.exports = Transport = {
  debug: false
};

/**
 * Do an HTTPS request.
 *
 * This performs a simple HTTPS request, and then
 * executes the callback, passing the response object into the
 * callback.
 *
 * @param {object} opts
 *   An object containing, at minimum, a parsed URL.
 *   To create a new opts, use URL.parse(url).
 * @param {string} body (Optional)
 *   The body o fthe request.
 * @param {Function} fn
 *   A callback function. This receives an Error (on error), a Response,
 *   and (if present) the data as a string.
 */
Transport.doRequest = function(opts, body, fn) {
  var a = Futil.argsWithFn(arguments, ['opts', 'body', 'fn']);
  fn = a.fn;
  opts = a.opts;
  body = a.body;

  // Define the request.
  var req = HTTPS.request(opts, function (response) {
    // We accept only status codes from 200-399.
    if (response.statusCode > 199 && response.statusCode < 400) {
      var responseData = '';
      response.on('data', function (bytes) {
        responseData += bytes;
      });
      response.on('end', function() {
        fn(false, response, responseData);
      });
      response.on('close', function (e) {
        fn(e);
      });
    }
    else {
      console.log("FAILED with HTTP status code %d", response.statusCode);
      var e = new Error('HTTP Error ' + response.statusCode);
      e.statusCode = response.statusCode;
      fn(e);
    }
  });

  // FIXME: Use better error handling.
  req.on('error', function (e) {
    console.log('FAILED outside of HTTP: ' + e.message);
    var err = new Error('Non-HTTP error: ' + e.message);
    err.statusCode = 0;
    fn(err);
  });

  // Write the body and trigger the request.
  if (body) {
    req.write(body);
  }
  req.end();
}

/**
 * Perform an HTTP request, but leave the data processing to something else.
 *
 * This is useful for requests that result in large payloads, or for any cases
 * where the response returned needs to be streamed to something else.
 *
 * ObjectStorage is the quintessential use case.
 *
 * fn(Error e, Stream response);
 *
 * This will emit an error when the status code is 400 or above, but it does not manage
 * redirects (3XX), 1XX and so on.
 *
 * IMPORTANT: On errors, the Stream is still passed.
 */
Transport.doUnmanagedRequest = function(opts, body, fn) {
  var a = Futil.argsWithFn(arguments, ['opts', 'body', 'fn']);
  fn = a.fn;
  opts = a.opts;
  body = a.body;

  // Define the request.
  var req = HTTPS.request(opts, function (response) {
    if (response.statusCode < 400) {
      fn(false, response);
    }
    else {
      console.log("FAILED with HTTP status code %d", response.statusCode);
      var e = new Error('HTTP Error ' + response.statusCode);
      e.statusCode = response.statusCode;
      fn(e, response);
    }
  });

  // FIXME: Use better error handling.
  req.on('error', function (e) {
    console.log('FAILED outside of HTTP: ' + e.message);
    var err = new Error('Non-HTTP error: ' + e.message);
    err.statusCode = 0;
    fn(err);
  });

  // Write the body and trigger the request.
  if (body) {
    req.write(body);
  }
  req.end();

}

/**
 * Send large objects with a chunked request.
 *
 * This attempts to use HTTP chunked transfer encoding to send large objects
 * to object storage.
 *
 * @param {Object} opts
 *   HTTP options.
 * @param {ReadableStream} stream
 *   A stream, set to read at the first byte that should be sent.
 * @param {Function} fn
 *   The callback, which will receive fn(Error e, HTTPResponse r, {Buffer| String} data, String md5).
 *   - e: set if there is an error
 *   - r: the response object
 *   - data: the body the remote host returned
 *   - md5: The checksum of the posted body, used to verify return headers.
 */
Transport.doChunkedRequest = function (opts, stream, fn) {

  var md5  = crypto.createHash('md5');
  opts.headers['Transfer-Encoding'] = 'chunked';

  // Define the request.
  var req = HTTPS.request(opts, function (response) {

    // We accept only status codes from 200-399.
    if (response.statusCode > 199 && response.statusCode < 400) {
      var responseData = '';
      response.on('data', function (bytes) {
        responseData += bytes;
      });
      response.on('end', function() {
        var digestMD5 = md5.digest('hex');
        fn(false, response, responseData, digestMD5);
      });
    }
    else {
      console.log("FAILED with HTTP status code %d", response.statusCode);
      var e = new Error('HTTP Error ' + response.statusCode);
      e.statusCode = response.statusCode;
      fn(e);
    }
  });

  if (Transport.debug) {
    req.on('socket', function (socket) {
      socket.on('data', function (data) {
        console.log('----> ' + data);
      });
    });
  }
  // FIXME: Use better error handling.
  req.on('error', function (e) {
    console.log('FAILED outside of HTTP: ' + e.message);
    var err = new Error('Non-HTTP error: ' + e.message);
    err.statusCode = 0;
    fn(err);
  });

  // If the input is a string or buffer, we just flush it and go.
  if (typeof stream == 'string' || stream instanceof Buffer) {
    md5.update(stream);
    req.write(stream);
    req.end();
    return;
  }

  stream.on('data', function (data) {
    md5.update(data);
    if (Transport.debug) console.log("Chunk: " + data);
  });
  stream.pipe(req);

}
