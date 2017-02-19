var AWS = require('../core');
var EventEmitter = require('events').EventEmitter;
require('../http');

var NSTrace = require('../ss_trace');

/**
 * @api private
 */
AWS.NsHttpClient = AWS.util.inherit({
  handleRequest : function handleRequest(httpRequest, httpOptions, callback, errCallback) {
    // TODO implement
  },
  emitter : null
});
/**
 * @!ignore
 */
/**
 * @api private
 */
AWS.HttpClient.prototype = AWS.NsHttpClient.prototype;
/**
 * @api private
 */
AWS.HttpClient.streamsApiVersion = 1;
