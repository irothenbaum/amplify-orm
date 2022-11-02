/*
These are for compile time types
 */

/**
 * @typedef {string|Object<string, Array<FragmentField>>} FragmentField
 *
 */

/**
 * @typedef {Object<string, Object<string, Array<FragmentField>>>} CustomFragmentsDefinition
 * Keyed by Model name, an object containing key:value pairs representing fragmentName:fragmentDefinition (array of fields)
 */

/**
 * @typedef {Object<string, Object<string, function>>} CustomHooksDefinition
 *
 * Keyed by Model name, an object containing key:value pairs representing hookType:function
 * Supported hook types are afterFind
 *
 * TODO: add support for:
 *  beforeFind
 *  before/afterCreate
 *  before/afterDelete
 *  before/afterUpdate
 */


const knownMap = {
  'ID': 'string',
  'String': 'string',
  'Float': 'number',
  'Int': 'number',
  'AWSDate': 'string|Date',
  'AWSDateTime': 'string|Date',
  'Boolean': 'boolean',
  // 'AWSJson': 'string|*', ???
  'ModelAttributeTypes': 'string', // TODO: This is an enum. We should handle all Enums more formally
}

/**
 * @param {string} type
 * @returns {string}
 */
function convertDynamoTypeToJSDoc(type) {
  // if it's an array, change to JSDoc type
  if (type[0] === '[') {
    return `Array<${convertDynamoTypeToJSDoc(type.slice(1,-1))}>`
  } else if (knownMap[type]) {
    return knownMap[type]
  }
  return type
}

module.exports = {
  convertDynamoTypeToJSDoc,

}
