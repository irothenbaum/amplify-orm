const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')
const {
  loadSchemaToString,
  schemaToModels,
  schemaToQueries,
} = require('../tools/schemaParsing')

class OutputDefinition {
  /**
   * @param {Array<GeneratedModel>} models
   * @param {Object<string, Object<string, Object<string, string>>>} queryDefinitions
   */
  constructor(models, queryDefinitions) {
    this.models = models
    this.queryDefinitions = queryDefinitions
  }

  /**
   * @param {string} directory
   */
  writeFiles(directory) {
    this._writeCollectionFiles(directory)
  }

  // ------------------------------------------------------------------------------------------
  // Protected functions
  /**
   * @param {string} outputDir
   * @protected
   */
  _writeCollectionFiles(outputDir) {
    // First we build the models folder index file
    fs.writeFileSync(
      path.join(outputDir, 'models', 'index.js'),
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'genericModule.txt'),
        ),
        {},
      ),
    )

    // next we create each individual model file
    this.models.forEach(m => this._writeSingleCollectionFile(outputDir, m))
  }

  /**
   * @param {string} outputDir
   * @param {GeneratedModel} model
   * @protected
   */
  _writeSingleCollectionFile(outputDir, model) {
    // First we build the models folder index file
    fs.writeFileSync(
      path.join(outputDir, 'collections', model.name + '.js'),
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'collection.txt'),
        ),
        {
          collectionName: model.name,
          // customQueriesStr: model.,
        },
      ),
    )

    // next we create each individual model file
    this.models.forEach(m => this._writeSingleCollectionFile(outputDir, m))
  }

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeFragments(outputDir) {}

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeQueries(outputDir) {}

  // ------------------------------------------------------------------------------------------
  // Static functions

  /**
   * @param {string} srcSchemaPath
   * @param {string} builtSchemaPath
   * @return {OutputDefinition}
   */
  static getFromSchema(srcSchemaPath, builtSchemaPath) {
    const srcSchemaStr = loadSchemaToString(srcSchemaPath)
    const builtSchemaStr = loadSchemaToString(builtSchemaPath)

    // get our basic models
    const models = schemaToModels(srcSchemaStr)

    // get the input types
    const queryParams = schemaToQueries(builtSchemaStr, models)

    return new OutputDefinition(models, queryParams)
  }
}

module.exports = OutputDefinition
