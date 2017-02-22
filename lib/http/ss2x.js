var AWS = require('../core');
var EventEmitter = require('events').EventEmitter;
require('../http');

var NSTrace = require('../ss_trace');

/**
 * @api private
 */
AWS.NsHttpClient = AWS.util.inherit({
  handleRequest : function handleRequest(httpRequest, httpOptions, callback, errCallback) {
    var self = this;
    var endpoint = httpRequest.endpoint;
    var emitter = new EventEmitter();
    var href = endpoint.protocol + '//' + endpoint.hostname;
    if (endpoint.port !== 80 && endpoint.port !== 443) {
      href += ':' + endpoint.port;
    }
    href += httpRequest.path;
    var useSSL = endpoint.protocol === 'https:';
    var http = useSSL ? NS.https : NS.http;
    var emitter = new EventEmitter();
    
    // log if the class is updated by NSTrace
    if (AWS.NsHttpClient._nst_constructor) {
      NSTrace.attachObjectInstance('AWS.NsHttpClient.emitter', emitter, 'debug', true /*no recursion attachment*/);
    }
    
    callback(emitter);
    var data = null;
    try {
      //log.debug('beforeRequest', JSON.stringify(httpRequest));
      var response = http.request({
        method : httpRequest.method,
        url : href,
        headers : httpRequest.headers,
        body : (httpRequest.body && typeof httpRequest.body.buffer === 'object') ? httpRequest.body.buffer
            : httpRequest.body
      });
      
      // log the tring
      if (AWS.NsHttpClient._nst_constructor) {
        log.debug('AWS.NsHttpClient.handleRequest [afterRequest]', JSON.stringify(response));
      }
      emitter.statusCode = response.code;
      emitter.headers = response.headers;
      data = response.body;
    } catch (ex) {
      // log the thing
      if (AWS.NsHttpClient._nst_constructor) {
        log.debug('requestError', JSON.stringify(ex));
      }
      if (errCallback) {
        errCallback(AWS.util.error(new Error('NetSuite Error'), {
          code : 'NetSuiteError',
          cause : ex
        }));
      }
      return emitter;
    }
    // headers event
    emitter.emit('headers', emitter.statusCode, emitter.headers);
    
    // data events
    if (data) {
      emitter.body = new AWS.util.Buffer(data);
      emitter.emit('data', emitter.body);
    }
    
    // end events
    emitter.emit('end');
    return emitter;
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
