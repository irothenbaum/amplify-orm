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
   * @param {Object<string, Object<string, string>>} queryDefinitions
   */
  constructor(models, queryDefinitions) {
    this.models = models
    this.queryDefinitions = queryDefinitions
  }

  /**
   * @param {string} directory
   */
  writeFiles(directory) {
    this._writeModelFiles
  }

  // ------------------------------------------------------------------------------------------
  // Protected functions
  /**
   * @param {string} outputDir
   * @protected
   */
  _writeModelFiles(outputDir) {
    // First we build the models folder index file
    fs.writeFileSync(
      path.join(outputDir, 'models', 'index.js'),
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'genericModule.txt'),
        ),
        {
          importsStr: this.models
            .map(m => `const ${m.name} = require('./${m.name})`)
            .join('\n'),
          exportStr: `{${this.models.map(m => m.name).join('\n')}`,
        },
      ),
    )

    // next we create each individual model file
    this.models.forEach(m => this._writeSingleModelFile(outputDir, m))
  }

  /**
   * @param {string} outputDir
   * @param {GeneratedModel} model
   * @protected
   */
  _writeSingleModelFile(outputDir, model) {}

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
    const queryParams = schemaToQueries(builtSchemaStr)

    return new OutputDefinition(models, queryParams)
  }
}

module.exports = OutputDefinition
