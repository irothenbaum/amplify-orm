
module.exports = {
  srcSchema: './schema.graphql', // required* path to src schema
  buildSchema: './schema-build.graphql', // required* path to build schema,

  fragments: './customFragments', // could either be a file name relative to this config file that exports the definition or a literal object definition itself
  hooks: './customHooks.js', // a file name relative to the config file that exports the definition
  useESM: false, // true IFF the exported module should use ESM syntax, defaults to false (CommonJS)

  debug: false, // if true, will print debug statements

  collections: [

  ],
}
