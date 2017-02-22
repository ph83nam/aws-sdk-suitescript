/**
 * @private
 * The following line will be replaced with real SuiteScript version
 */
require('./ss' + NS.VERSION + '_loader');

var AWS = require('./core');

if (typeof window !== 'undefined') window.AWS = AWS;
if (typeof module !== 'undefined') module.exports = AWS;
if (typeof self !== 'undefined') self.AWS = AWS;

/**
 * @private
 * DO NOT REMOVE
 * SuiteScript builder will strip out this line if services are supplied on the command line.
 */
require('../clients/browser_default');
