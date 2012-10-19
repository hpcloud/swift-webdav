var pronto = require('pronto');
var DOMParser = require('xmldom').DOMParser;
var Buffer = require('buffer').Buffer;
/**
 * Parse XML out of a stream.
 *
 * TODO: The xmldom package has a SAX parser that cannot handle
 * streamed data. Should add a source that supports streams.
 *
 * Params:
 * - input: A readable stream. If not supplied, then the request is
 *   used. (OPTIONAL)
 * - encoding: The encoding on the stream. (OPTIONAL)
 * - supportedContentTypes: This will only attempt to parse bodies when
 *   the Content-Type is a known type. By default, text/xml and
 *   application/xml are the only two known types. Set custom types with
 *   this param. (this *replaces* supported types, so may want to
 *   include text/xml). Content types should be in lowercase. (OPTIONAL)
 */
function ParseXML() {
  this.supportedContentTypes = [
    'text/xml', 'application/xml'
  ];
}
pronto.inheritsCommand(ParseXML);
module.exports = ParseXML;

ParseXML.prototype.execute = function(cxt, params) {
  var cmd = this;
  var request = cxt.getDatasource('request');
  var stream = params.input || request;
  var encoding = params.encoding || this.determineCharset(request.headers);
  var errorHandler = new XMLErrorHandler(cxt);
  var cTypes = params.supportedContentTypes || this.supportedContentTypes;

  if (request.headers['content-type']) {
    var parts = request.headers['content-type'].split(';');
    var ctype = parts[0].toLowerCase();
    if (cTypes.indexOf(ctype) == -1) {
      cxt.log('This is not XML to me: %s', ctype, 'warning');
      //this.reroute('@415');
      this.done();
      return;
    }
  }
  // Apparently, since the stupid spec doesn't *require* a content type,
  // we have to deal with missing content types. We skip GET for safety.
  else if (request.method != 'GET' && request.headers['content-length'] 
           && parseInt(request.headers['content-length']) > 4) {
    // Do nothing.
    cxt.log('Client did not supply content-type for its body, but it supplied length.', 'warning');

  }
  // If no Content-Type and no Content-Length, don't fetch the data.
  else {
    cxt.log('No content type or length found for body. Skipping XML parsing.', 'debug');
    this.done();
    return;
  }

  var parserOptions = {
    errorHandler: errorHandler
  }

  stream.setEncoding(encoding);

  // var buffers = [];
  // var bufflen = 0;
  var xml = '';
  stream.on('data', function (data) {
    // bufflen += data.length;
    // buffers.push(data);
    xml += data;
  });
  stream.on('end', function () {
    cxt.log("PARSING %s", xml, 'debug');
    //var xml = Buffer.concat(buffers, bufflen);
    var parser = new DOMParser();
    // var dom = parser.parseFromString(xml.toString(encoding));
    var dom = parser.parseFromString(xml);

    if (errorHandler.hasError) {
      cxt.log('Parsing XML failed.', 'warning');
      return;
    }

    cmd.done(dom);
  });

  // All errors are 500 errors.
  stream.on('error', function (e) {
    cxt.log('fatal', 'Unknown error fetching stream: %s', e.message);
    this.reroute('@500', cxt);
  });

  cxt.log("Parsing XML body.", "debug");

  // If stream is paused, kick it back into gear.
  stream.resume();
}

/**
 * Guess the character set.
 *
 * This is a little fuzzy for several reasons. Basically, what we're
 * after is a way to decode a string from a buffer. For that reason, we
 * heavily favor UTF-8 (since that's the default encoding for XML, and
 * since it can more or less decode ISO-8859-* sets into SOME kind of
 * string).
 *
 * When it comes to the parser itself, though, it should have more
 * information about what the character set really ought to be. We
 * assume that it handles the final conversion of data.
 *
 * Clearly, there's room for improvement here.
 */
ParseXML.prototype.determineCharset = function(headers) {
  var type = headers['content-type'];

  if (!type) {
    return 'utf8';
  }

  var parts = type.split(';');
  if (parts.length < 2) {
    return 'utf8';
  }

  var matches = parts[1].match(/encoding=\"(.*)\"/);

  if (matches && matches[1]) {
    var ct = matches[1].trim().toLowerCase();
    switch (ct) {
      case 'utf-16':
        return 'utf16le';
      // FIXME: Should handle ISO-8859-*?
      case 'utf-8':
      default:
        return 'utf8';
    }

  }

  return 'utf8';
}

function XMLErrorHandler(cxt) {
  this.cxt = cxt;
  this.hasError = false;
}

XMLErrorHandler.prototype.warning = function (msg) {
  this.cxt.log(msg, 'warning');
}
XMLErrorHandler.prototype.error = function (msg) {
  this.hasError = true;
  this.cxt.log(msg, 'error');
}
XMLErrorHandler.prototype.fatalError = function (msg) {
  this.hasError = true;
  this.cxt.log(msg, 'fatal');
}
