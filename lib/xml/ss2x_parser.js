var util = require('../util');
var Shape = require('../model/shape');

function NsXmlParser() { }

NsXmlParser.prototype.parse = function(xml, shape) {
  if (xml.replace(/^\s+/, '') === '') return {};

  var result, error;
  try {
    if (NS.xml) {
      // @todo implement this
      result = NS.xml.Parser.fromString({text: xml});
    } else {
      throw new Error('Cannot load XML parser NS.xml');
    }
  } catch (e) {
    error = e;
  }

  if (result && result.documentElement && !error) {
    var data = parseXml(result.documentElement, shape);
    var metadata = result.getElementsByTagName('ResponseMetadata');
    if (metadata && metadata.length > 0) {
      data.ResponseMetadata = parseXml(metadata, {});
    }
    return data;
  } else if (error) {
    if (NsXmlParser._nst_constructor) {
      log.error('NsXmlParser.parse [' + error.code + '] name: ' + ' message: ' + error.message + ' at ' + error.fileName + ':' + error.lineNumber, error.stack);
    }
    throw util.error(error || new Error(), {code: 'XMLParserError', retryable: false});
  } else { 
    // empty xml document
    return {};
  }
};

function parseXml(xml, shape) {
  if (!shape) shape = {};
  switch (shape.type) {
    case 'structure': return parseStructure(xml, shape);
    case 'map': return parseMap(xml, shape);
    case 'list': return parseList(xml, shape);
    case undefined: case null: return parseUnknown(xml);
    default: return parseScalar(xml, shape);
  }
}

function parseStructure(xml, shape) {
  var data = {};
  if (xml === null) return data;

  util.each(shape.members, function(memberName, memberShape) {
    if (memberShape.isXmlAttribute) {
      if (xml.hasAttribute({name: memberShape.name})) {
        var value = xml.attributes[memberShape.name];
        data[memberName] = parseXml({textContent: value}, memberShape);
      }
    } else {
      var xmlChild = memberShape.flattened ? xml : xml.getElementsByTagName(memberShape.name)[0];
      if (xmlChild) {
        data[memberName] = parseXml(xmlChild, memberShape);
      } else if (!memberShape.flattened && memberShape.type === 'list') {
        data[memberName] = memberShape.defaultValue;
      }
    }
  });

  return data;
}

function parseMap(xml, shape) {
  var data = {};
  var xmlKey = shape.key.name || 'key';
  var xmlValue = shape.value.name || 'value';
  var tagName = shape.flattened ? shape.name : 'entry';

  var child = xml.firstChild;
  while (child) {
    if (child.nodeName === tagName) {
      var key = child.getElementsByTagName(xmlKey)[0].textContent;
      var value = child.getElementsByTagName(xmlValue)[0];
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
    if (xml.parentNode && xml.parentNode.parentNode === null) return {};
    if (xml.childNodes && xml.childNodes.length === 0) return '';
    else return xml.textContent;
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

module.exports = NsXmlParser;