/**
 * @typedef AmplifyORMConfig
 * @property {string} srcSchema -- required, path to src schema.graphql file
 * @property {string} buildSchema -- required, path to build schema.graphql file
 * @property {Array<>}
 */

module.exports = {
  srcSchema: './schema.graphql', // required* path to src schema
  buildSchema: './schema-build.graphql', // required* path to build schema,

  fragments: require('./customFragments'),
  hooks: require('./customHooks'),

  debug: false, // if true, will print debug statements
}
