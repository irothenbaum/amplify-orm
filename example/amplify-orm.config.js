/**
 * @typedef AmplifyORMConfig
 * @property {string} srcSchema -- required, path to src schema.graphql file
 * @property {string} buildSchema -- required, path to build schema.graphql file
 * @property {Array<>}
 */

module.exports = {
  srcSchema: '', // required* path to src schema
  buildSchema: '', // required* path to src schema,

  fragments: require('./customFragments'),
  hooks: require('./customHooks'),
}
