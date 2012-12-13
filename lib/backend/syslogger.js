var posix = require('posix');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Syslogger;

function Syslogger(logger, options) {
  options = options || {};
  var facility = options.facility || "local7";
  var f = options.priorities || ["warning", "error", "fatal", "info", "debug", "access", "custom"];

  // Open the syslog, but defer the actual connection until the first
  // message is written.
  posix.openlog("hpcloud-webdav", {odelay: true, pid: true}, facility);


  // Add an event listener for each facility.
  for (var i = 0; i < f.length; ++i) {
    logger.on(f[i], function (level, msg) {
      Syslogger.write(options, level, msg);
    });
  }

}

Syslogger.write = function (options, level, msg) {
  switch (level) {
    // Eponymous
    case "warning":
    case "info":
    case "debug":
      posix.syslog(level, msg);
      break;


    // Directly correlated
    case "fatal":
      posix.syslog("alert", msg);
      break;
    case "error":
      posix.syslog("err", msg);
      break;


    // No good fit.
    case "access":
    case "custom":
    default:
      posix.syslog("info", msg);
      break;

  }
}
