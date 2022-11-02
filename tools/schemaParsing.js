const GeneratedModel = require('../models/GeneratedModel')
const QueryDefinition = require('../models/QueryDefinition')
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
  const connections = {}
  const params = modelDefinition
    .split('\n')
    .map(kvpair => kvpair.trim())
    .filter(v => !!v)
    .map(kvpair => {
      const parts = kvpair.split(':').map(v => v.trim())

      const connection = getConnectionFromFieldValue(parts[1])
      if (connection) {
        connection[parts[0]] = connection
      }

      return parts[0]
    })
  return new GeneratedModel(modelName, params, connections)
}

/**
 * @param {string} val
 * @returns {string|null}
 */
function getConnectionFromFieldValue(val) {
  const reg = new RegExp(`\\[*([A-Za-z]+)\\]*\\s@[a-zA-z]+`)
  const match = reg.exec(val)
  if (match) {
    return match[1]
  }
  return null
}

// ------------------------------------------------------------------------------------------

/**
 * @param schemaStr
 * @param {Array<GeneratedModel>} models
 * @returns {void}
 */
function addQueriesToModels(schemaStr, models) {
  return Object.assign(
    {},
    addQueriesOrMutationsToModels('Query', schemaStr, models),
    addQueriesOrMutationsToModels('Mutation', schemaStr, models),
  )
}

/**
 * @param {string} type
 * @param {string} schemaStr
 * @param {Array<GeneratedModel>} models
 */
function addQueriesOrMutationsToModels(type, schemaStr, models) {
  const reg = new RegExp(
    `type[\\s]+${type}[\\s]+{([.\\s\\w\\d:!@\\[\\]\\(\\),]*)}`,
    'md',
  )

  const match = reg.exec(schemaStr)
  const lines = match[1]
    .split('\n')
    .map(queryDef => queryDef.trim())
    .filter(v => !!v)

  const returnTypeToModel = models.reduce((agr, m) => {
    agr[m.name] = m
    agr[`Model${m.name}Connection`] = m
    return agr
  }, [])

  return lines.reduce((agr, line) => {
    // we want to separate the `getPost` from the `(id: ID!)`
    // so that we're left with just getPost, and `id: ID!`
    const [queryName, partsStr] = line.split('(').map(v => {
      v = v.trim()
      const closingPar = v.indexOf(')')
      if (closingPar >= 0) {
        const paramsStr = v.slice(0, closingPar)
        // now we convert all the 'id: ID!' into {id: 'ID!'}
        return paramsStr.split(',').reduce((inputs, kvpair) => {
          const kvParts = kvpair.split(':')
          inputs[kvParts[0].trim()] = kvParts[1].trim()
          return inputs
        }, {})
      }
      return v
    })

    const returnTypeSplit = line.split(':')
    const returnType = returnTypeSplit[returnTypeSplit.length - 1]
    const model = returnTypeToModel[returnType]
    if (model) {
      const queryType =
        type === 'Mutation'
          ? QueryDefinition.TYPE_MUTATION
          : returnType === model.name
          ? QueryDefinition.TYPE_QUERY_ONE
          : QueryDefinition.TYPE_QUERY_LIST

      model.addQueryDefinition(
        new QueryDefinition(queryType, queryName, partsStr),
      )

      // every list query will also have an iterative query
      if (queryType === QueryDefinition.TYPE_QUERY_LIST) {
        new QueryDefinition(QueryDefinition.TYPE_QUERY_ITERATIVE, queryName, partsStr)
      }
    }

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
  addQueriesToModels,
}
