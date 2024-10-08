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
 * @returns {Object<string, Array<string>>} // keyed by enum name, value is array of enum values
 */
function findEnumsInSchema(schemaStr) {
  const reg = new RegExp(
    `enum[\\s]+([A-Za-z0-9]+)[\\s]+{([\\w\\s.]+)}`,
    'gmd',
  )

  const matches = schemaStr.matchAll(reg)
  global.LOG(`Found ${matches.length} enums`)

  const retVal = {}
  for (const match of matches) {
    retVal[match[1]] = match[2].split(' ').map(s => s.trim()).filter((s) => !!s)
  }

  global.LOG(`Found ${Object.keys(retVal).length} enums`, retVal)

  return retVal
}

/**
 * @param {string} schemaStr
 * @param {string} builtSchemaStr
 * @param {Object<string, Array<string>>} enums
 * @return {Array<GeneratedModel>}
 */
function schemaToModels(schemaStr, builtSchemaStr, enums) {
  /*
    TODO: If there's a comment between type and @model definition, this will break.e.eg:
      type User
      # this is a comment
      @model
   */
  const reg = new RegExp(
    `type[\\s]+([A-Za-z0-9]+)[\\s]+@model`,
    'gmd',
  )

  const retVal = []
  const matches = schemaStr.matchAll(reg)

  global.LOG(`Found ${matches.length} models`)

  for (const match of matches) {
    const modelName = match[1]
    retVal.push(getModelFromMatch(modelName, builtSchemaStr, enums))
  }

  global.LOG(`Created ${retVal.length} generated models`)

  return retVal
}

/**
 * @param {string} modelName
 * @param {string} builtSchemaStr
 * @param {Object<string, Array<string>>} enums
 * @return {GeneratedModel}
 */
function getModelFromMatch(modelName, builtSchemaStr, enums) {
  global.LOG(`Parsing model ${modelName}`)

  const reg = new RegExp(`type ${modelName}[ @aws_api_key| @aws_cognito_user_pools]* {\\s?([.\\sa-zA-Z0-9_:!(,)\\[\\]]+)}`,'m')
  const matche = builtSchemaStr.match(reg)

  if (!matche) {
    throw new Error(`Could not get model ${modelName} from schema`)
  }

  const filedsStr = matche[1]
  global.LOG(`Found fields str:`, filedsStr)

  const params = filedsStr
    .split('\n')
    .map(kvpair => kvpair.trim())
    .filter(v => !!v)
    .reduce((agr, kvpair) => {
      const parts = kvpair.split(':').map(v => v.trim())

      global.LOG(`Found field parts: `, parts)

      let dataType = parts[parts.length - 1]
      let name = parts[0]
      let nameIndexOfParenthesis = name.indexOf('(')
      if (nameIndexOfParenthesis > 0) {
        name = name.substr(0, nameIndexOfParenthesis)
      }

      dataType = normalizeDataTypeIfNeeded(dataType)
      agr[name] = dataType

      return agr
    }, {})

  return new GeneratedModel(modelName, params, enums)
}

/**
 * @param {string} val
 * @returns {string|null}
 */
function normalizeDataTypeIfNeeded(val) {
  const reg = new RegExp(`Model([A-Za-z0-9]+)Connection`)
  const match = reg.exec(val)
  if (match) {
    return `[${match[1]}]`
  }
  return val
}

// ------------------------------------------------------------------------------------------

/**
 * @param schemaStr
 * @param {Array<GeneratedModel>} models
 * @returns {void}
 */
function addQueriesToModels(schemaStr, models) {
  addQueriesOrMutationsToModels('Query', schemaStr, models)
  addQueriesOrMutationsToModels('Mutation', schemaStr, models)
}

// Model Connection payloads take the form of {items: [], nextToken: string}
function getModelConnectionNameFromModelName(modelName) {
  return `Model${modelName}Connection`
}

/**
 * @param {string} type
 * @param {string} schemaStr
 * @param {Array<GeneratedModel>} models
 */
function addQueriesOrMutationsToModels(type, schemaStr, models) {
  global.LOG(`Adding ${type} types to ${models.length} models`)

  const reg = new RegExp(
    `type[\\s]+${type}[\\s]+{([.\\s\\w\\d:!@\\[\\]\\(\\),]*)}`,
    'md',
  )

  const match = reg.exec(schemaStr)
  const lines = match[1]
    .split('\n')
    .map(queryDef => queryDef.replace('@aws_api_key', '').replace('@aws_cognito_user_pools', '').trim())
    .filter(v => !!v)

  const returnTypeToModel = models.reduce((agr, m) => {
    agr[m.name] = m
    agr[getModelConnectionNameFromModelName(m.name)] = m

    // TODO: this is basically a way to associate custom resolvers on a model so maybe this is also configurable?
    //  i.e., devs can explicitly associate a Query or Mutation in schema.graphql to a collection
    //  for now we just include a common one: [MODEL_NAME]
    agr[`[${m.name}]`] = m
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

    global.LOG(`Parsed query ${queryName} with parts:`, partsStr)

    const returnTypeSplit = line.split(':')

    global.LOG(`Return type split: `, returnTypeSplit)

    const returnType = returnTypeSplit[returnTypeSplit.length - 1].trim()

    global.LOG(`Return type: `, returnType)

    const model = returnTypeToModel[returnType]

    global.LOG(`Model: `, model)

    if (model) {
      const queryType =
        type === 'Mutation'
          ? QueryDefinition.TYPE_MUTATION
          // if it's returning a ModelConnection payload, then it's a list query
          : returnType === getModelConnectionNameFromModelName(model.name)
          ? QueryDefinition.TYPE_QUERY_LIST
          // in all other cases, treat it like a simple Get
          : QueryDefinition.TYPE_QUERY_ONE

      model.addQueryDefinition(
        new QueryDefinition(queryType, queryName, partsStr),
      )

      // every list query will also have an iterative query
      if (queryType === QueryDefinition.TYPE_QUERY_LIST) {
        model.addQueryDefinition(
          new QueryDefinition(QueryDefinition.TYPE_QUERY_ITERATIVE, queryName, partsStr)
        )
      }
    } else {
      global.LOG(`WARNING: Missing model`)
    }

    return agr
  }, {})
}

// ------------------------------------------------------------------------------------------

/**
 * @param {string} schemaStr
 * @returns {Object<string, Object<string, string>>}
 */
function getInputTypeDefinitions(schemaStr) {
  global.LOG(`Parsing input types from schema`)
  const reg = new RegExp(
    `input[\\s]+([.\\w\\d:!@\\[\\]\\(\\),]*)[\\s]+{([.\\s\\w\\d:!@\\[\\]\\(\\),]*)}`,
    'gmd',
  )

  const retVal = {}
  const matches = schemaStr.matchAll(reg)

  global.LOG(`Found ${matches.length} Input types`)

  for (const match of matches) {
    const inputName = match[1]
    const fields = match[2]

    retVal[inputName] = fields.split('\n').reduce((agr, line) => {
      const parts = line.split(':').map(p => p.trim())

      // if either the field or the type is missing, we skip
      if (!parts[0] || !parts[1]) {
        return agr
      }

      agr[parts[0]] = parts[1]
      return agr
    }, {})

    global.LOG(`Added input type ${inputName}:`, retVal[inputName])
  }

  return retVal
}

module.exports = {
  loadSchemaToString,
  schemaToModels,
  addQueriesToModels,
  getInputTypeDefinitions,
  findEnumsInSchema
}
