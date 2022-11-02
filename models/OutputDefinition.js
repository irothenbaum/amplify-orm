const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')
const {
  loadSchemaToString,
  schemaToModels,
  addQueriesToModels,
} = require('../tools/schemaParsing')

class OutputDefinition {
  /**
   * @param {Array<GeneratedModel>} models
   */
  constructor(models) {
    this.models = models
  }

  /**
   * @param {string} directory
   */
  writeFiles(directory) {
    this._writeCollectionFiles(directory)
    this._writeQueryFiles(directory)
    this._writeDynamicStaticTypes(directory)
  }


  // ------------------------------------------------------------------------------------------
  // Protected functions

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeQueryFiles(outputDir) {
    // next we create the query definition file
    fs.writeFileSync(
      path.join(outputDir, 'queryInputs.js'),
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'genericModule.txt'),
        ).toString(),
        {
          importsStr: '',
          exportStr: `{\n${this.models.map(m => m.queries.map(q => `  ${q.toQueryParamDefinition()}`).join(',\n')).join(',\n')}\n}`,
        },
      ),
    )

  }

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeDynamicStaticTypes(outputDir) {
    // TODO: The dynamicTypes.str should be a collection of typedefs that describe the input objects for each function
  }

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeCollectionFiles(outputDir) {
    // First we build the models folder index file
    fs.writeFileSync(
      path.join(outputDir, 'collections', 'index.js'),
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'genericModule.txt'),
        ).toString(),
        {
          importsStr: ''

        },
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
    // Here we build each model's collection module
    fs.writeFileSync(
      path.join(outputDir, 'collections', model.getCollectionName() + '.js'),
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'collection.txt'),
        ).toString(),
        {
          collectionName: model.getCollectionName(),
          queryDefinitions: model.queries
            .map(def => def.toFunctionDefinition(model.getCollectionName()))
            .join('\n'),
          fragmentsStr: Object.entries(model.fragments).map(
            ([fragmentName, fields]) => model.toFragment(fragmentName, fields),
          ),
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
   * @param {CustomFragmentsDefinition} fragments
   * @param {CustomHooksDefinition} hooks
   * @return {OutputDefinition}
   */
  static getFromSchema(srcSchemaPath, builtSchemaPath, fragments, hooks) {
    const srcSchemaStr = loadSchemaToString(srcSchemaPath)
    const builtSchemaStr = loadSchemaToString(builtSchemaPath)

    // get our basic models
    const models = schemaToModels(srcSchemaStr)

    // apply the input types
    addQueriesToModels(builtSchemaStr, models)

    // add our custom fragments and hooks to the models
    models.forEach(m => {
      const modelFragments = fragments[m.name]
      const modelHooks = hooks[m.name]

      if (modelFragments) {
        Object.entries(modelFragments).forEach(([name, definition]) =>
          m.addFragment(name, definition),
        )
      }

      if (modelHooks) {
        Object.entries(modelHooks).forEach(([name, definition]) =>
          m.addHook(name, definition),
        )
      }
    })

    return new OutputDefinition(models)
  }
}

module.exports = OutputDefinition
