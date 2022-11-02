const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')
const {convertDynamoTypeToJSDoc} = require('../tools/types')
const {
  loadSchemaToString,
  schemaToModels,
  addQueriesToModels,
  getInputTypeDefinitions,
} = require('../tools/schemaParsing')

class OutputDefinition {
  /**
   * @param {Array<GeneratedModel>} models
   * @param {Object<string, Object<string, string>>} inputTypes
   */
  constructor(models, inputTypes) {
    this.models = models
    this.inputTypes = inputTypes
  }

  /**
   * @param {string} directory
   */
  writeFiles(directory) {
    this._writeCollectionFiles(directory)
    this._writeQueryFiles(directory)
    this._writeDynamicStaticTypes(directory)

    this._copySrcFiles(directory)
  }


  // ------------------------------------------------------------------------------------------
  // Protected functions

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeQueryFiles(outputDir) {
    global.LOG('Writing queryInputs.js file')
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
      {flag: 'w'}
    )

  }

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeDynamicStaticTypes(outputDir) {
    const inputTypeNames = Object.keys(this.inputTypes)
    global.LOG(`Writing ${inputTypeNames.length} Input types to dynamicTypes.js`)

    fs.writeFileSync(
      path.join(outputDir, 'dynamicTypes.js'),
      inputTypeNames.map(name => {
        global.LOG(`Writing ${name} type:`, this.inputTypes[name])
        return Mustache.render(
          fs.readFileSync(
            path.join(__dirname, '..', 'templates', 'typeDefinition.txt'),
          ).toString(),
          {
            typeName: name,
            propertiesStr: Object.entries(this.inputTypes[name]).map(([param, type]) => {
              const isRequired = type.includes('!')
              return `  @property {${convertDynamoTypeToJSDoc(type.replace('!', ''))}${isRequired ? '' : '?'}} ${param}`
            }).join('\n')
          },
        )
      }).join('\n\n'),
      {flag: 'w'}
    )
  }

  /**
   * @param {string} outputDir
   * @protected
   */
  _writeCollectionFiles(outputDir) {
    // create our collections folder
    fs.mkdirSync(path.join(outputDir, 'collections'))

    global.LOG(`Created collections folder`)

    // First we build the models folder index file
    fs.writeFileSync(
      path.join(outputDir, 'collections', 'index.js'),
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'genericModule.txt'),
        ).toString(),
        {
          importsStr: this.models.map(m => `const ${m.getCollectionName()} = require('./${m.getCollectionName()}.js')`).join('\n'),
          exportStr: `{\n${this.models.map(m => `  ${m.getCollectionName()}`)}\n}`
        },
      ),
      {flag: 'w'}
    )

    global.LOG(`Created collections/index.js`)

    // next we create each individual model file
    this.models.forEach(m => this._writeSingleCollectionFile(outputDir, m))
  }

  /**
   * @param {string} outputDir
   * @param {GeneratedModel} model
   * @protected
   */
  _writeSingleCollectionFile(outputDir, model) {
    const collectionPath = path.join(outputDir, 'collections', model.getCollectionName() + '.js')
    global.LOG(`Writing ${model.name} to ${collectionPath}`)
    // Here we build each model's collection module
    fs.writeFileSync(
      collectionPath,
      Mustache.render(
        fs.readFileSync(
          path.join(__dirname, '..', 'templates', 'collection.txt'),
        ).toString(),
        {
          collectionName: model.getCollectionName(),
          queryDefinitions: model.queries
            .map(def => def.toFunctionDefinition(model.getCollectionName()))
            .join('\n'),
          fragmentsStr: model.getFragmentDefinitions()
        },
      ),
      {flag: 'w'}
    )
  }

  /**
   * @param {string} outputDir
   * @protected
   */
  _copySrcFiles(outputDir) {
    // TODO: Copy the source files
  }

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
    global.LOG(`Reading schema files`)
    const srcSchemaStr = loadSchemaToString(srcSchemaPath)
    global.LOG(`Loaded schema from ${srcSchemaPath}`)
    const builtSchemaStr = loadSchemaToString(builtSchemaPath)
    global.LOG(`Loaded build schema from ${builtSchemaPath}`)

    // get our basic models
    const models = schemaToModels(srcSchemaStr)

    // apply the input types
    addQueriesToModels(builtSchemaStr, models)

    // add our custom fragments and hooks to the models
    global.LOG(`Adding custom fragments and hooks to the models`)
    models.forEach(m => {
      global.LOG(`Checking model ${m.name}`)
      const modelFragments = fragments[m.name]
      const modelHooks = hooks[m.name]

      const customFragmentNames = modelFragments && Object.keys(modelFragments)
      if (customFragmentNames) {
        global.LOG(`Found ${customFragmentNames.length} fragments to add`, modelFragments)
        Object.entries(modelFragments).forEach(([name, definition]) =>
          m.addFragment(name, definition),
        )
      } else {
        global.LOG(`No custom fragments to add`)
      }

      const customHookNames = modelHooks && Object.keys(modelHooks)
      if (customHookNames) {
        global.LOG(`Found ${customHookNames.length} hooks to add -- SKIPPING`, modelHooks)
        // Object.entries(modelHooks).forEach(([name, definition]) =>
        //   m.addHook(name, definition),
        // )
      } else {
        global.LOG(`No custom hooks to add`)

      }
    })

    const inputTypes = getInputTypeDefinitions(builtSchemaStr)

    return new OutputDefinition(models, inputTypes)
  }
}

module.exports = OutputDefinition
