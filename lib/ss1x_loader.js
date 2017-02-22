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
AWS.XML.Parser = require('./xml/ss1x_parser');

// Load the XHR HttpClient
require('./http/ss1x');

// Load fixes for SuiteScript
require('./ss-fix');

if (typeof process === 'undefined') {
  process = {
    browser: true
  };
}

// this one is declared by builder script
if (NS !== undefined) {
  //define log
  if (NS.log == undefined) {
    NS.log = {};
    ['debug', 'audit', 'error', 'emergency'].forEach(function (level) {
      NS.log[level] = function (title, details) {
        nlapiLogExecution(level.toUpperCase(), title, details);
      };
    });
  }
  
  //define util
  if (NS.util == undefined) {
    NS.util = {
      isNumber: function (value) {
        return typeof value == 'number';
      },
    };
  }
  
  AWS.NSTrace = require('./ss_trace');
  NS.AWS = AWS;
}
