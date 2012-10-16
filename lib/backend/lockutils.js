exports.extractLockToken = function (tokenString) {
  // Find (<URI>). We don't enforce the URI structure. We just try to
  // match the middle part.
  var tokens = tokenString.match(/^\(\<([^\>]*)\>\)$/);
  if (tokens.length > 0) {
    return tokens[0];
  }
}

exports.lockFromXML = function (dom) {

}
