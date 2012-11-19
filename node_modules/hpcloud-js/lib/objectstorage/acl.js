module.exports = ACL;

/**
 * Construct a new ACL.
 *
 * By default, an ACL is set to "private."
 *
 * EXPERIMENTAL: This is bassed on a feature of Swift that is likely to
 * change. Most of this is based on undocmented features of the API
 * discovered both in the Python docs and in discussions by various
 * members of the OpenStack community.
 *
 * Swift access control rules are broken into two permissions: READ and
 * WRITE. Read permissions grant the user the ability to access the file
 * (using verbs like GET and HEAD), while WRITE permissions allow any
 * modification operation. WRITE does not imply READ.
 *
 * In the current implementation of Swift, access can be assigned based
 * on two different factors:
 *
 * - Accounts: Access can be granted to specific accounts, and within
 *   those accounts, can be further specified to specific users. See the
 *   addAccount() method for details on this.
 * - Referrers: Access can be granted based on host names or host name
 *   patterns. For example, only subdomains of <tt>*.example.com</tt> may be
 *   granted READ access to a particular object.
 *
 * ACLs are transmitted within the HTTP headers for an object or
 * container. Two headers are used: X-Container-Read for READ rules, and
 * X-Container-Write for WRITE rules. Each header may have a chain of
 * rules.
 *
 * For a detailed description of the rules for ACL creation,
 * see http://swift.openstack.org/misc.html#acls
 */
function ACL() {
  this.rules = [];
}

/**
 * Read flag.
 */
ACL.READ = 1;
/**
 * Write flag.
 */
ACL.WRITE = 2;
/**
 * Read/write flag (shorthand for READ | WRITE).
 */
ACL.READ_WRITE = 3; // Convencience for OR

/**
 * Header for read permissions.
 */
ACL.HEADER_READ = 'X-Container-Read';

/**
 * Header for write permissions.
 */
ACL.HEADER_WRITE = 'X-Container-Write';

ACL.makePublic = function() {
  var acl = new ACL();
  acl.addReferrer(ACL.READ, '*');
  acl.allowListings();

  return acl;
}

ACL.makePrivate = function () {
  return new ACL();
}

/**
 * Parse an ACL rule into a rule object.
 *
 * @param {int} perm
 *   One of ACL.READ or ACL.WRITE.
 * @param {string} rule
 *   A string representation of a rule.
 * @return {object} A rule object.
 */
ACL.parseRule = function (perm, rule) {
  // This regular expression generates the following:
  //
  // [
  //   0 = ENTIRE RULE
  //   1 = WHOLE EXPRESSION, no whitespace
  //   2 = domain compontent
  //   3 = 'rlistings', set if .rincludes is the directive
  //   4 = account name
  //   5 = :username
  //   6 = username
  // ];
  var matcher = /^\s*(.r:([a-zA-Z0-9\*\-\.]+)|\.(rlistings)|([a-zA-Z0-9]+)(\:([a-zA-Z0-9]+))?)\s*$/;
  var matches = matcher.exec(rule);

  var entry = {
    mask: perm,
  }

  if (matches[2]) {
    entry.host = matches[2];
  }
  else if (matches[3]) {
    entry.rlistings = true;
  }
  else if (matches[4]) {
    entry.account = matches[4];
    if (matches[6]) {
      entry.user = matches[6];
    }
  }
  return entry;
}

/**
 * Build a new ACL object from a header array.
 *
 * This will scan headers for expected rules, and parse
 * out the results. If no headers are found, the returned
 * ACL will be private.
 *
 * @param {array} headers
 *   The headers array.
 * @return {ACL}
 *   The ACL object.
 */
ACL.newFromHeaders = function (headers) {
  var acl = new ACL();
  var rules = [];

  if (headers[ACL.HEADER_READ]) {
    rules = headers[ACL.HEADER_READ].split(',');
    for (var i = 0; i < rules.length; ++i) {
      rule = rules[i];
      var ruleObj = ACL.parseRule(ACL.READ, rule);
      if (ruleObj.mask) {
        acl.rules.push(ruleObj);
      }
    }
  }

  rules = [];
  if (headers[ACL.HEADER_WRITE]) {
    rules = headers[ACL.HEADER_WRITE].split(',');
    for (var i = 0; i < rules.length; ++i) {
      rule = rules[i];
      var ruleObj= ACL.parseRule(ACL.WRITE, rule);
      if (ruleObj.mask) {
        acl.rules.push(ruleObj);
      }
    }
  }

  return acl;
}

/**
 * Grant ACL access to an account.
 *
 * Optionally, a user may be given to further limit access.
 *
 * This is used to restrict access to a particular account and, if so
 * specified, a specific user on that account.
 *
 * If just an account is given, any user on that account will be
 * automatically granted access.
 *
 * If an account and a user is given, only that user of the account is
 * granted access.
 *
 * If $user is an array, every user in the array will be granted
 * access under the provided account. That is, for each user in the
 * array, an entry of the form \c account:user will be generated in the
 * final ACL.
 *
 * At this time there does not seem to be a way to grant global write
 * access to an object.
 *
 * @param {int} perm
 *   ACL.READ, ACL.WRITE or ACL.READ_WRITE
 * @param {string} account
 *   The name of the account.
 * @param {string|array} user
 *   The name of the user, or optionally an indexed array of user
 *   names.
 */
ACL.prototype.addAccount = function (perm, account, user) {
  rule = {account: account};
  if (user) {
    rule.user = user;
  }
  return this.addRule(perm, rule);
}
/**
 * Allow (or deny) a hostname or host pattern.
 *
 * In current Swift implementations, only READ rules can have host
 * patterns. WRITE permissions cannot be granted to hostnames.
 *
 * Formats:
 * - Allow any host: '*'
 * - Allow exact host: 'www.example.com'
 * - Allow hosts in domain: '.example.com'
 * - Disallow exact host: '-www.example.com'
 * - Disallow hosts in domain: '-.example.com'
 *
 * Note that a simple minus sign ('-') is illegal, though it seems it
 * should be "disallow all hosts."
 *
 * @param {object} perm
 *   The permission. One of ACL.READ, ACL.WRITE, ACL.READ_WRITE.
 * @param {string} host
 *   A host string, as described above.
 * @return this
 */
ACL.prototype.addReferrer = function (perm, host) {
  this.addRule(perm, {host: host});
  return this;
}

/**
 * Add a rule to the rule set.
 *
 * This adds a rule with the given permission to the rule set.
 *
 * @param {object} perm
 *   A permission object.
 * @param {object} rule
 *   A rule.
 * @returns this
 */
ACL.prototype.addRule = function (perm, rule) {
  rule.mask = perm;
  this.rules.push(rule);

  return this;
}

/**
 * Allow hosts with READ permissions to list a container's content.
 *
 * By default, granting READ permission on a container does not grant
 * permission to list the contents of a container. Setting the
 * ACL.allowListings() permission will allow matching hosts to also list
 * the contents of a container.
 *
 * In the current Swift implementation, there is no mechanism for
 * allowing some hosts to get listings, while denying others.
 *
 * @return this
 */
ACL.prototype.allowListings = function () {
  this.rules.push({
    mask: ACL.READ,
    rlistings: true
  });
}

/**
 * Get the rules set.
 *
 * @return {array}
 *   An array of rule objects.
 */
/*
ACL.prototype.rules = function() {
  return this.rules;
}
*/

/**
 * Transform the rule set into HTTP headers.
 *
 * @return {array} headers.
 */
ACL.prototype.headers = function () {
  var headers = [];
  var readers = [];
  var writers = [];

  for (var i = 0; i < this.rules.length; ++i) {
    var rule = this.rules[i];
    var rstring;
    if (ACL.READ & rule.mask) {
      rstring = this.ruleToString(ACL.READ, rule);
      if (rstring.length > 0) {
        readers.push(rstring);
      }
    }
    if (ACL.WRITE & rule.mask) {
      rstring = this.ruleToString(ACL.WRITE, rule);
      if (rstring && rstring.length > 0) {
        writers.push(rstring);
      }
    }
  }

  if (readers.length > 0) {
    headers[ACL.HEADER_READ] = readers.join(',');
  }
  if (writers.length > 0) {
    headers[ACL.HEADER_WRITE] = writers.join(',');
  }

  return headers;
}

/**
 * Convert a rule to a string.
 *
 * @param {int} perm
 *   The permission type (ACL.WRITE, ACL.READ).
 * @param {object} rule
 *   The rule object.
 */
ACL.prototype.ruleToString = function (perm,rule) {
  if (ACL.READ & perm) {
    if (rule.host) {
      return '.r:' + rule.host;
    }
    if (rule.rlistings) {
      return '.rlistings';
    }
  }

  if (rule.account) {
    // Just an account name.
    if (!rule.user) {
      return rule.account;
    }

    // Just one user.
    if ('string' == typeof rule.user) {
      return rule.account + ':' + rule.user;
    }

    // Account + multiple users.
    var buffer = [];
    for (var i = 0; i < rule.user; ++i) {
      buffer.push(rule.account + ':' + rule.user[i]);
    }

    return buffer.join(',');
  }

}

/**
 * Check if the ACL marks this private.
 *
 * This returns TRUE only if this ACL does not grant any permissions
 * at all.
 *
 * @returns {boolean}
 *   TRUE if this is private (non-public), FALSE if
 *   any permissions are granted via this ACL.
 */
ACL.prototype.isPrivate = function () {
  return this.rules.length == 0;
}
/**
 * Check whether this object allows public reading.
 *
 * This will return TRUE the ACL allows (a) any host to access
 * the item, and (b) it allows container listings.
 *
 * This checks whether the object allows public reading,
 * not whether it is ONLY allowing public reads.
 *
 * See ACL.makePublic().
 */
ACL.prototype.isPublic = function () {
  var allowsAllHosts = false;
  var allowsRListings = false;
  for (var i = 0; i < this.rules.length; ++i) {
    var rule = this.rules[i];
    if (rule.rlistings) allowsRListings = true;
    if (rule.host && rule.host.trim() == '*') allowsAllHosts = true;
  }
  return allowsAllHosts && allowsRListings;
}

ACL.prototype.toString = function () {
  var headers = this.headers();
  var buffer = [];

  for (var h in headers) {
    buffer.push(h + ': ' + headers[h]);
  }
  return buffer.join("\t");
}

