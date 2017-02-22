
var xmlFactory = require('./ss_factory');

/**
 * 
 * @param text
 * @returns
 */
function stringToXml(text) {
  return nlapiStringToXML(text);
}

/**
 * 
 * @param xml
 * @param tagName
 * @returns
 */
function firstElementByTagName(xml, tagName) {
  return xml.getElementsByTagName(tagName).item(0);
}

module.exports = xmlFactory(stringToXml, firstElementByTagName);