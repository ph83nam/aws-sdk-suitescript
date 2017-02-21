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
    var emitter = new EventEmitter();
    if (AWS.NsHttpClient._nst_constructor) {
      nlapiLogExecution('DEBUG', 'AWS.NsHttpClient.handleRequest [before]',
          href + '\n' + JSON.stringify(httpRequest));
    }
    // log if the class is updated by NSTrace
    if (AWS.NsHttpClient._nst_constructor) {
      NSTrace.attachObjectInstance('AWS.NsHttpClient.emitter', emitter,
          'debug', true /* no recursion attachment */);
    }

    callback(emitter);
    var data = null;
    try {
      var reqData = httpRequest.body && typeof httpRequest.body.buffer === 'object' 
          ? httpRequest.body.buffer
          : httpRequest.body;
      var response = nlapiRequestURL(href, reqData, httpRequest.headers,
          httpRequest.method);

      if (AWS.NsHttpClient._nst_constructor) {
        nlapiLogExecution('DEBUG', 'AWS.NsHttpClient.handleRequest [afterRequest]', 
          JSON.stringify({
            code : response.code,
            body : response.body,
          }));
      }
      emitter.statusCode = response.code;
      emitter.headers = {};

      ALL_HEADERS.forEach(function (header) {
        var value = response.getHeader(header);
        if (!!value) {
          emitter.headers[header] = value;
        }
      });
      data = response.body;
    } catch (ex) {
      // log the thing
      var errObj = typeof ex != 'nlobjError' ? ex : {
        code : ex.getCode(),
        details : ex.getDetails(),
        stack : ex.getStackTrace(),
      };

      if (AWS.NsHttpClient._nst_constructor) {
        nlapiLogExecution('ERROR', 'requestError', JSON.stringify(errObj));
      }
      if (errCallback) {
        errCallback(AWS.util.error(new Error('NetSuite Error'), {
          code : 'NetSuiteError',
          cause : errObj
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

//because response.getAllHeaders() require input parameter

const ALL_HEADERS = [
    "x-amzn-ErrorType", "x-amzn-RequestId", "x-amzn-ErrorType", 'X-Amzn-Trace-Id',
    //@see http://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/constant-values.html
    "x-amz-abort-date", "x-amz-abort-rule-id", "x-amz-",
    "Cache-Control", "X-Amz-Cf-Id", "Connection", "Content-Disposition",
    "Content-Encoding", "Content-Language", "Content-Length", "Content-MD5",
    "Content-Range", "Content-Type", "x-amz-copy-source-range",
    "x-amz-copy-source-if-match", "x-amz-copy-source-if-modified-since",
    "x-amz-copy-source-if-none-match", "x-amz-copy-source-if-unmodified-since",
    "x-amz-copy-source-server-side-encryption-customer-algorithm",
    "x-amz-copy-source-server-side-encryption-customer-key",
    "x-amz-copy-source-server-side-encryption-customer-key-MD5",
    "x-amz-cek-alg", "x-amz-crypto-instr-file", "x-amz-iv", "x-amz-key",
    "x-amz-key-v2", "x-amz-wrap-alg", "x-amz-tag-len", "Date", "ETag",
    "x-amz-expiration", "Expires", "x-amz-id-2", "If-Match",
    "If-Modified-Since", "If-None-Match", "If-Unmodified-Since",
    "Last-Modified", "x-amz-matdesc", "x-amz-metadata-directive",
    "x-amz-replication-status", "Range", "x-amz-website-redirect-location",
    "x-amz-request-id", "x-amz-request-charged", "x-amz-request-payer",
    "x-amz-restore", "x-amz-date", "x-amz-bucket-region", "x-amz-acl",
    "x-amz-mfa", "x-amz-mp-parts-count", "x-amz-region", "x-amz-tagging",
    "x-amz-tagging-count", "x-amz-meta-", "x-amz-version-id",
    "x-amz-security-token", "Server", "x-amz-server-side-encryption",
    "x-amz-server-side-encryption-aws-kms-key-id",
    "x-amz-server-side-encryption-customer-algorithm",
    "x-amz-server-side-encryption-customer-key",
    "x-amz-server-side-encryption-customer-key-MD5", "x-amz-storage-class",
    "x-amz-tagging-directive", "x-amz-unencrypted-content-length",
    "x-amz-unencrypted-content-md5" 
  ];
