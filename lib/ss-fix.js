var AWS = require('./core');

// fix for Mozila Rhino JavaScript which fails with input like "<a/>(...)"
// error occurs at https://github.com/aws/aws-sdk-js/blob/master/lib/util.js#L36
AWS.util.uriEscape = function (string) {
  var output = encodeURIComponent(string);
  // because of js_escape() at https://github.com/mozilla/rhino/blob/master/src/org/mozilla/javascript/NativeGlobal.java#L379
  output = output.replace(/[^A-Za-z0-9_.~\-%]+/g, function (ch) {
    return escape(ch);
  });

  // AWS percent-encodes some extra non-standard characters in a URI
  output = output.replace(/[*]/g, function (ch) {
    return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
  });

  return output;
};
