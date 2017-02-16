
var AWS = {};
var NS = {};

var notFound = [];

/**
 * 
 * @param value
 * @param recursed
 * @returns
 */
function safeStringify(value, recursed) {
  var type = typeof value;
  try {
    return type == 'function' ? ('' + value) : JSON.stringify(value);
  } catch (ex) {
    if (recursed || type !== 'object') {
      return 'safe: ' + value;
    } else {
      var output = {};
      for (var member in value) {
        if (typeof value[member] == 'function') {
          output[member] = 'function: ' + value[member];
        } else {
          output[member] = safeStringify(value[member], true);
        }
      }
      
      return 'safe: ' + JSON.stringify(output);
    }
  }
}

/**
 * 
 * @param targetName string
 *   name of target under AWS i.e AWS.SQS
 * @param parentTarget boolean|null
 *   if target parent should be return
 */
function resolveTarget(targetName, parentTarget) {
  var current = AWS;
  var parts = targetName.split('.');
  //var parentName = parts.length > 1 ? parts[parts.length - 2] : null;
  if (parentTarget) {
    parts.splice(parts.length - 1, 1);
  }
  parts.forEach(function (member) {
    if (current) {
      current = current[member];
    }
  });
  
  return current;
}

/**
 * 
 * @param args
 * @param trace
 * @returns
 */
function stringifyArguments(args, trace) {
  var obj = [];
  for (var index = 0; index < args.length; index ++) {
    var type = (typeof args[index]);
    var value;
    if (type == 'function') {
      value = trace ? ('' + args[index]) : (type + ': ' + args[index].name);
    } else {
      value = type + ': ' + args[index];
    }
    obj.push(value);
  }
  
  return safeStringify(obj);
}

/**
 * @param targetName string
 *   name of target under AWS i.e AWS.SQS
 * @param func function
 *   static or prototype method related to target
 * @param level string
 *   debug audit error emergency
 */
function attachFunction(targetName, func, level) {
  if (func._nst_attach) return func;
  
  var logFunc = function () {
    var nsLogFunc = NS.log[level];
    var begin = new Date();
    if (nsLogFunc) {
      var argsInfo = stringifyArguments(arguments, level == 'debug');
      nsLogFunc.apply(NS.log, ['[' + begin.getTime() + ' ' + targetName + ']', argsInfo]);
    }
    var retVal = func.apply(this, arguments);
    if (nsLogFunc) {
      var params = ['[~' + begin.getTime() + ' ' + targetName + '] in ' + ((new Date()).getTime() - begin.getTime()) + 'ms'];
      if (retVal !== undefined) params.push(safeStringify(retVal));
      nsLogFunc.apply(NS.log, params);
    }
    return retVal;
  };
  logFunc._nst_attach = true;
  return logFunc;
}

/**
 * 
 * @param parentName
 * @param parentType function
 *   constructor of the type
 * @param memberName
 * @param level
 * @returns function
 *   the proxy type
 */
function attachConstructor(parentName, parentType, memberName, level) {
  var returnType;
  // replace constructor
  if (!parentType._nst_constructor) {
    returnType = AWS.util.inherit(parentType, {
      constructor: function () {
        // because service class may return different instance from "this"
        var instance = parentType.apply(this, arguments);
        var self = instance ? instance : this;
        // attach the list after constructor has been call
        for (var memberName in returnType._nst_attachList) {
          var attached = true;
          if (self[memberName]) {
            switch (typeof self[memberName]) {
            case 'function':
              self[memberName] = attachFunction(parentName + '.' + memberName, self[memberName], returnType._nst_attachList[memberName]);
              break;
            case 'object':
              self[memberName] = attachObjectInstance(parentName + '.' + memberName, self[memberName], returnType._nst_attachList[memberName], true);
              break;
            default:
              attached = false;
            }
          } else {
            attached = memberName == '__all__';
          }
          if (attached) continue;
          var attachName = parentName + '.prototype.' + memberName;
          if (notFound.indexOf(attachName) == -1) {
            notFound.push(attachName);
            NS.log.debug('reloadAwsLoggers target not found', attachName);
          }
        }
        
        // attach all functions
        if (returnType._nst_attachList.__all__ !== undefined) {
          instance = attachObjectInstance(parentName, self, returnType._nst_attachList.__all__, false);
        }
        
        return instance ? instance : self;
      },
    });
    // copy static value
    for (var member in parentType) {
      if (returnType[member] === undefined) {
        returnType[member] = parentType[member];
      }
    };
    returnType._nst_constructor = parentType;
  } else {
    returnType = parentType;
  }
  
  // add to delay attach
  if (!returnType._nst_attachList) {
    returnType._nst_attachList = {};
  } 
  if (returnType._nst_attachList[memberName] === undefined) {
    returnType._nst_attachList[memberName] = level;
  }
  return returnType;
}

/**
 * @param targetName string
 *   name of target under AWS i.e AWS.SQS
 * @param target object
 *   class or object whose functions will be attach
 * @param level string
 *   debug audit error emergency
 * @param noRecursion boolean
 *   do not recurse
 * @param noAlter boolean
 *   so object does not like to have another member
 * @returns object
 *   the target object
 */
function attachObjectInstance(targetName, target, level, noRecursion, noAlter) {
  if (target._nst_attach) return;
  for (var member in target) {
    if (!target[member] || ['console', 'constructor', 'prototype', '__super__'].indexOf(member)!==-1) continue;
    var type = typeof target[member];
    switch (type) {
    case 'function':
      target[member] = attachFunction(targetName + '.' + member, target[member], level, target);
      break;
    case 'object':
      if (!noRecursion) {
        attachObjectInstance(targetName + '.' + member, target[member], level, true, member == 'params');
      }
      break;
    }
  }
  if (!noAlter) {
    // some object doesn't like having another attribute
    target._nst_attach = true;
  }
  return target;
}

/**
 * 
 */
function reloadAwsLoggers(theNS, awslog) {
  NS = theNS;
  if (!awslog && NS && NS.awslog) awslog = NS.awslog;
  AWS = NS.AWS ? NS.AWS : require('./core');
  
  AWS.util.each(awslog, function (targetName) {
    var targetLevel = 'debug';
    if (NS.util.isNumber(targetName)) {
      targetName = NS.awslog[targetName];
    } else {
      targetLevel = NS.awslog[targetName];
      if (typeof targetLevel == 'function') {
        targetLevel = NS.awslog[targetName]();
      };
    }
    var target = targetName == 'NS.AWS' ? AWS : resolveTarget(targetName);
    // some functions are defined by constructor
    var parts = targetName.split('.');
    var memberName = parts[parts.length - 1];
   
    if (!target) {
      // try adding lated attachment
      if (parts.length > 2 && parts[parts.length-2]=='prototype') {
        parts.splice(parts.length-2, 2);
        var parentName = parts.join('.');
        var parent = resolveTarget(parentName);
        if (parent && typeof parent == 'function' && parent.prototype) {
          parts.splice(parts.length-1, 1);
          var ancestor = parts.length == 0 ? AWS:resolveTarget(parts.join('.'));
          if (ancestor) {
            ancestor[parentName] = attachConstructor(parentName + '.prototype', parent, memberName, targetLevel);
            return;
          }
        }
      }
      if (notFound.indexOf(targetName)==-1) {
        notFound.push(targetName);
      }
      return;
    }
    parts.splice(parts.length-1, 1);
    var parentName = parts.join('.');
    var parent = parts.length ? resolveTarget(parentName):AWS;
    var type = typeof target;
    switch (type) {
    case 'function':
      if (target.__super__ || targetName.indexOf('.prototype.') == -1) {
        if (target.prototype) {
          parent[memberName] = attachConstructor(targetName, target, '__all__', targetLevel);
        } else {
          attachObjectInstance(targetName, target, level);
        }
      } else {
        parent[memberName] = attachFunction(targetName, target, targetLevel);
      }
      break;
    default:
      if (NS.error) {
        throw NS.error.create({
          name: 'UNKNOWN_MEMBER_TYPE',
          message: 'name: ' + targetName + ' type: ' + type
        });
      } else {
        throw new Error('UNKOWN_MEMBER_TYPE name: ' + targetName + ' type: ' + type);
      }
    }
    
  });
  //log not found targets
  if (notFound.length > 0) {
    NS.log.debug('reloadAwsLoggers target not found', notFound.join(', '));
  }
}

// invoke on required
// reloadAwsLoggers();

module.exports = {
  attachConstructor: attachConstructor,
  attachObjectInstance: attachObjectInstance,
  attachFunction: attachFunction,
  reloadAwsLoggers: reloadAwsLoggers
};