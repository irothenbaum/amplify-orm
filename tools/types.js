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
 * @typedef CompiledAmplifyORMConfig
 * @property {string} srcSchema -- required, path to src schema.graphql file
 * @property {string} buildSchema -- required, path to build schema.graphql file
 * @property {Object<string, *>} fragments -- fragments object
 * @property {string|null} hooks -- path to hooks file
 * @property {boolean} useESM -- if true, will use ESM syntax, defaults to false
 * @property {Array<string>?} collections -- if included, will only build collections that are listed here
 */

/**
 * @typedef {CompiledAmplifyORMConfig} AmplifyORMConfig
 * @property {string|Object<string, *>?} fragments -- path to fragments file or the fragments themselves
 * @property {string?} hooks
 * @property {boolean?} useESM
 * @property {boolean?} debug -- if true, will print debug statements
 * @property {Array<string>?} collections
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
  'AWSJSON': 'string',
}

const primitiveTypes = Object.keys(knownMap)

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
  primitiveTypes
}
