const GeneratedModel = require('../models/GeneratedModel')
const fs = require('fs')

/**
 * @param {string} schemaPath
 * @returns {string}
 */
function loadSchemaToString(schemaPath) {
  return fs.readFileSync(schemaPath).toString()
}

/**
 * @param {string} schemaStr
 * @return {Array<GeneratedModel>}
 */
function schemaToModels(schemaStr) {
  const reg = new RegExp(
    `type[\\s]+([A-Za-z0-9]+)[\\s]*@model[\\s]+{([.\\s\\w\\d:!@\\[\\]]*)}`,
    'gmd',
  )

  const retVal = []
  const matches = schemaStr.matchAll(reg)
  for (const match of matches) {
    console.log(match)

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
  const paramsMap = modelDefinition
    .split('\n')
    .map(kvpair => kvpair.trim())
    .filter(v => !!v)
    .reduce((agr, kvpair) => {
      const parts = kvpair.split(':').map(v => v.trim())
      return (agr[parts[0]] = getFieldType(parts[1]))
    }, {})
  return new GeneratedModel(modelName, paramsMap)
}

/**
 * @param {string} rawTypeStr
 * @return {string}
 */
function getFieldType(rawTypeStr) {}

module.exports = {
  loadSchemaToString,
  schemaToModels,
}
