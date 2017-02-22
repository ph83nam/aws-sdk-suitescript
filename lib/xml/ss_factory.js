var util = require('../util');
var Shape = require('../model/shape');

var firstElementByTagName = function (xml, tagName) {
  return xml.getElementsByTagName(tagName)[0];
}

/**
 * to be assigned by 
 */
var stringToXml;

/**
 * exports
 */
function NsXmlParser() { }

/**
 * main function
 * @param xml
 * @param shape
 * @returns
 */
NsXmlParser.prototype.parse = function(xml, shape) {
  if (xml.replace(/^\s+/, '') === '') return {};

  var result, error;
  try {
    result = stringToXml(xml);
  } catch (e) {
    error = e;
  }
  
  if (result && result.documentElement && !error) {
    try {
      var data = parseXml(result.documentElement, shape);
      var metadata = result.getElementsByTagName('ResponseMetadata');
      if (metadata && metadata.length > 0) {
        data.ResponseMetadata = parseXml(metadata, {});
      }
      return data;
    } catch (e) {
      NS.log.error('parseXML ' + NS.errorCode(e), NS.errorDetails(e));
      throw e;
    }
  } else if (error) {
    if (NsXmlParser._nst_constructor) {
      NS.log.error('NsXmlParser.parse ' + NS.errorCode(e), NS.errorDetails(e));
    }
    throw util.error(error || new Error(), {
      code: 'XMLParserError',
      retryable: false
    });
  } else { 
    // empty xml document
    return {};
  }
};

function parseXml(xml, shape) {
  if (!shape) shape = {};
  switch (shape.type) {
    case 'structure':
      return parseStructure(xml, shape);
    case 'map':
      return parseMap(xml, shape);
    case 'list':
      return parseList(xml, shape);
    case undefined:
    case null:
      return parseUnknown(xml);
    default:
      return parseScalar(xml, shape);
  }
}

function parseStructure(xml, shape, get1stElement) {
  var data = {};
  if (xml === null) return data;

  util.each(shape.members, function(memberName, memberShape) {
    if (memberShape.isXmlAttribute) {
      if (xml.hasAttribute({name: memberShape.name})) {
        var value = xml.attributes[memberShape.name];
        data[memberName] = parseXml({textContent: value}, memberShape);
      }
    } else {
      var xmlChild = memberShape.flattened ? xml : firstElementByTagName(xml, memberShape.name);
      if (xmlChild) {
        data[memberName] = parseXml(xmlChild, memberShape);
      } else if (!memberShape.flattened && memberShape.type === 'list') {
        data[memberName] = memberShape.defaultValue;
      }
    }
  });

  return data;
}

function parseMap(xml, shape, get1stElement) {
  var data = {};
  var xmlKey = shape.key.name || 'key';
  var xmlValue = shape.value.name || 'value';
  var tagName = shape.flattened ? shape.name : 'entry';

  var child = xml.firstChild;
  while (child) {
    if (child.nodeName === tagName) {
      var key = firstElementByTagName(child, xmlKey).textContent;
      var value = firstElementByTagName(child, xmlValue);
      data[key] = parseXml(value, shape.value);
    }
    child = child.nextSibling;
  }
  return data;
}

function parseList(xml, shape) {
  var data = [];
  var tagName = shape.flattened ? shape.name : (shape.member.name || 'member');

  var child = xml.firstChild;
  while (child) {
    if (child.nodeName === tagName) {
      data.push(parseXml(child, shape.member));
    }
    child = child.nextSibling;
  }
  return data;
}

function parseScalar(xml, shape) {
  if (xml.getAttribute) {
    var encoding = xml.getAttribute('encoding');
    if (encoding === 'base64') {
      shape = new Shape.create({type: encoding});
    }
  }

  var text = xml.textContent;
  if (text === '') text = null;
  if (typeof shape.toType === 'function') {
    return shape.toType(text);
  } else {
    return text;
  }
}

function parseUnknown(xml) {
  if (xml === undefined || xml === null) return '';

  // empty object
  if (!xml.firstChild) {
    if (xml.parentNode && xml.parentNode.parentNode === null)
      return {};
    if (xml.childNodes && xml.childNodes.length === 0)
      return '';
    else
      return xml.textContent;
  }

  // object, parse as structure
  var shape = {
    type: 'structure',
    members: {}
  };
  var child = xml.firstChild;
  while (child) {
    var tag = child.nodeName;
    if (Object.prototype.hasOwnProperty.call(shape.members, tag)) {
      // multiple tags of the same name makes it a list
      shape.members[tag].type = 'list';
    } else {
      shape.members[tag] = {name: tag};
    }
    child = child.nextSibling;
  }
  return parseStructure(xml, shape);
}

module.exports = function (strToXml, get1st) {
  if (!strToXml) throw new Error('strToXml is missing');
  
  stringToXml = strToXml;
  firstElementByTagName = get1st || firstElementByTagName;
  
  return NsXmlParser;
};