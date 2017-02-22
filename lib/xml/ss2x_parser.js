var xmlFactory = require('./ss_factory');

/**
 * 
 * @param text
 * @returns
 */
function stringToXml(xml) {
  return NS.xml.Parser.fromString({text: xml});
}

module.exports = xmlFactory(stringToXml);