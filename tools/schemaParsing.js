const GeneratedModel = require('../models/GeneratedModel')
const fs = require('fs')

/**
 * @param {string} schemaPath
 * @returns {string}
 */
function loadSchemaToString(schemaPath) {
  return fs.readFileSync(schemaPath).toString()
}

// ------------------------------------------------------------------------------------------

/**
 * @param {string} schemaStr
 * @return {Array<GeneratedModel>}
 */
function schemaToModels(schemaStr) {
  const reg = new RegExp(
    `type[\\s]+([A-Za-z0-9]+)[\\s]+@model[\\s]+{([.\\s\\w\\d:!@\\[\\]]*)}`,
    'gmd',
  )

  const retVal = []
  const matches = schemaStr.matchAll(reg)
  for (const match of matches) {
    const modelName = match[1]
    const modelDefinition = match[2]

    retVal.push(getModelFromMatch(modelName, modelDefinition))
  }

  return retVal
}

/**
 * @param {string} modelName
 * @param {string} modelDefinition
 * @return {GeneratedModel}
 */
function getModelFromMatch(modelName, modelDefinition) {
  const params = modelDefinition
    .split('\n')
    .map(kvpair => kvpair.trim())
    .filter(v => !!v)
    .map(kvpair => {
      const parts = kvpair.split(':').map(v => v.trim())
      return parts[0]
    })
  return new GeneratedModel(modelName, params)
}

// ------------------------------------------------------------------------------------------

/**
 * @param schemaStr
 * @returns {Object<string, Object<string, string>>}
 */
function schemaToQueries(schemaStr) {
  return Object.assign(
    {},
    schemaToQueriesOrMutations('Query', schemaStr),
    schemaToQueriesOrMutations('Mutation', schemaStr),
  )
}

/**
 * @param {string} type
 * @param {string} schemaStr
 * @returns {Object<string, Object<string, string>>}
 */
function schemaToQueriesOrMutations(type, schemaStr) {
  const reg = new RegExp(
    `type[\\s]+${type}[\\s]+{([.\\s\\w\\d:!@\\[\\]\\(\\),]*)}`,
    'md',
  )

  const match = reg.exec(schemaStr)

  return match[1]
    .split('\n')
    .map(queryDef => queryDef.trim())
    .filter(v => !!v)
    .reduce((agr, queryDef) => {
      // we want to separate the `getPost` from the `(id: ID!)`
      // so that we're left with just getPost, and `id: ID!`
      const parts = queryDef.split('(').map(v => {
        v = v.trim()
        const closingPar = v.indexOf(')')
        if (closingPar >= 0) {
          return v.slice(0, closingPar)
        }
        return v
      })
      // now we convert all the 'id: ID!' into {id: 'ID!'}
      agr[parts[0]] = parts[1].split(',').reduce((inputs, kvpair) => {
        const kvParts = kvpair.split(':')
        inputs[kvParts[0].trim()] = kvParts[1].trim()
        return inputs
      }, {})
      return agr
    }, {})
}

// ------------------------------------------------------------------------------------------

/**
 * @param {string} rawTypeStr
 * @return {string}
 */
function getFieldType(rawTypeStr) {}

module.exports = {
  loadSchemaToString,
  schemaToModels,
  schemaToQueries,
}
