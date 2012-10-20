exports.extractLockToken = function (tokenString) {
  // Find (<URI>). We don't enforce the URI structure. We just try to
  // match the middle part.
  var tokens = tokenString.match(/\(\<([^\>]*)\>\)/);
  // 0: entire string
  // 1: the token
  if (tokens && tokens.length > 1) {
    return tokens[1];
  }
}
