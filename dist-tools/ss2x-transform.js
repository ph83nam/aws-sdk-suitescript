var Transform = require('stream').Transform;
var collector = require('./service-collector');
var license = require('./ss2x-builder').license;

module.exports = function(file) {
  var stream = new Transform();
  // console.error('[NS] transforming ' + file);
  var didDefineServices = !!process.env.AWS_SERVICES;
  var isEntryPoint = !!file.match(/[\/\\]lib[\/\\]ss2x\.js$/);

  stream._transform = function(data, encoding, callback) {
    callback(null, data);
  };

  if (isEntryPoint) {
    if (didDefineServices) {
      // We need to strip out the default requires statement
      stream._transform = function(data, encoding, callback) {
        var code = data.toString();
        code = code.trim();
        var lines = code.split('\n');
        lines = lines.filter(function(line) {
          return !line.match(/^require\(.+browser_default['"]\);$/);
        });
        code = lines.join('\n');
        data = new Buffer(code);
        callback(null, data);
      };

      var src = collector(process.env.AWS_SERVICES);
      stream._flush = function(callback) {
        // set defaultRetryCount to zero because NetSuite has no setTimeout() to do that
        stream.push("AWS.util.update(AWS.Service.prototype, {defaultRetryCount: 0});\n");
        stream.push(src);
        callback();
      };
    }

    stream.push(license);
  }

  return stream;
};
