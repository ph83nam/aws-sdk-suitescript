var util = require('./util');

// browser specific modules
util.crypto.lib = require('crypto-browserify');
util.Buffer = require('buffer/').Buffer;
util.url = require('url/');
util.querystring = require('querystring/');

var AWS = require('./core');

// Use default API loader function
require('./api_loader');

// Load the DOMParser XML parser
AWS.XML.Parser = require('./xml/ss2x_parser');

// Load the XHR HttpClient
require('./http/ss2x');

if (typeof process === 'undefined') {
  process = {
    browser: true
  };
}

// this one is declared by builder script
if (NS !== undefined) {
  AWS.NSTrace = require('./ss2x_trace');
  NS.AWS = AWS;
}

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
