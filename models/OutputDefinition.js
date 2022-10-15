const {loadSchemaToString, schemaToModels} = require('../tools/schemaParsing')

class OutputDefinition {
  /**
   * @param {Array<GeneratedModel>} models
   */
  constructor(models) {}

  /**
   * @param {string} schemaPath
   * @return {OutputDefinition}
   */
  static getFromSchema(schemaPath) {
    const schemaStr = loadSchemaToString(schemaPath)
    const models = schemaToModels(schemaStr)
  }
}

module.exports = OutputDefinition
