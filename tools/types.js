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
