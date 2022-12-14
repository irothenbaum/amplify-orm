/**
 * @typedef AmplifyORMConfig
 * @property {string} srcSchema -- required, path to src schema.graphql file
 * @property {string} buildSchema -- required, path to build schema.graphql file
 * @property {Array<>}
 */

module.exports = {
  srcSchema: './schema.graphql', // required* path to src schema
  buildSchema: './schema-build.graphql', // required* path to build schema,

  fragments: require('./customFragments'), // could either be a file name relative to this config file that exports the definition or a literal object definition itself
  hooks: './customHooks.js', // a file name relative to the config file that exports the definition

  debug: false, // if true, will print debug statements
}
