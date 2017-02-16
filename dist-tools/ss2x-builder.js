#!/usr/bin/env node

var path = require('path');

var AWS = require('../');

var license = [
  '// AWS SDK for NetSuite v' + AWS.VERSION,
  '// Copyright iCareBenefits.com, Inc. or its affiliates. All Rights Reserved.',
  '// License at https://sdk.amazonaws.com/js/BUNDLE_LICENSE.txt'
].join('\n') + '\n';

var nsDefineStart = [
  'define([\'N/xml\', \'N/http\', \'N/https\', \'N/error\'], function(nsXml, nsHttp, nsHttps, nsError) {',
  '  var NS = {xml: nsXml, http: nsHttp, https: nsHttps, error: nsError, util: util, log: log, require: require};',
  //hide NetSuite require() function
  '  var require = undefined;',
  '  var AWS = undefined;'  // avoid "AWS is not defined" error
].join('\n') + '\n';

var nsDefineEnd = [
  '  return NS.AWS',
  '}); // end of NetSuite define()'
].join('\n') + '\n';

function minify(code) {
  var uglify = require('uglify-js');
  var minified = uglify.minify(code, {fromString: true});
  return minified.code;
}

function stripComments(code) {
  var lines = code.split(/\r?\n/);
  var multiLine = false;
  lines = lines.map(function (line) {
    var rLine = line;
    if (line.match(/^\s*\/\//)) {
      rLine = null;
    } else if (line.match(/^\s*\/\*/)) {
      multiLine = true;
      rLine = null;
    }

    if (multiLine) {
      var multiLineEnd = line.match(/\*\/(.*)/);
      if (multiLineEnd) {
        multiLine = false;
        rLine = multiLineEnd[1];
      } else {
        rLine = null;
      }
    }

    return rLine;
  }).filter(function(l) { return l !== null; });

  var newCode = lines.join('\n');
  newCode = newCode.replace(/\/\*\*[\s\S]+?Copyright\s+.+?Amazon[\s\S]+?\*\//g, '');
  return newCode;
}

function build(options, callback) {
  if (arguments.length === 1) {
    callback = options;
    options = {};
  }

  var img = require('insert-module-globals');
  img.vars.process = function() { return '{browser:false}'; };

  if (options.services) process.env.AWS_SERVICES = options.services;

  var browserify = require('browserify');
  var brOpts = {
    basedir : path.resolve(__dirname, '..'),
    packageFilter : function (pkg, filePath) {
      if (filePath == this.basedir + '/package.json') {
        pkg.browser = {
          'lib/aws.js' : './lib/ss2x.js',
          'fs' : false,
          './global.js' : './ss2x.js',
          './lib/node_loader.js' : './lib/netsuite_loader.js'
        };
        pkg.browserify = {
          "transform" : "./dist-tools/ss2x-transform.js"
        };
      }
      return pkg;
    }
  };
  browserify(brOpts).add('./').ignore('domain').ignore('./lib/browser_loader.js').bundle(function(err, data) {
    if (err) return callback(err);

    var code = (data || '').toString();
    if (options.minify) code = minify(code);
    else code = stripComments(code);

    code = license + nsDefineStart + code + nsDefineEnd;
    callback(null, code);
  });
}

// run if we called this tool directly
if (require.main === module) {
  var opts = {
    services: process.argv[2] || process.env.SERVICES,
    minify: process.env.MINIFY ? true : false
  };
  build(opts, function(err, code) {
    if (err) console.error(err.message);
    else console.log(code);
  });
}

build.license = license;
module.exports = build;
