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
    this.modelsLookup = models.reduce((agr, m) => {
      agr[m.name] = m
      return agr
    }, {})
    this.inputTypes = inputTypes
  }

  /**
   * @param {string} directory
   */
  writeFiles(directory) {
    if (!directory) {
      throw new Error('Must specify output directory')
    }

    global.LOG(`Begin writing files to ${directory}`)
    this.outputDirectory = directory
    this._writeCollectionFiles()
    this._writeQueryFiles()
    this._writeDynamicStaticTypes()

    if (this.hooksPath) {
      this._copyHooksFile()
    } else {
      global.LOG(`No custom hooks specified, skipping`)
    }

    this._copySrcFiles()
    global.LOG(`Done writing files`)
  }

  /**
   * @param {string} path
   */
  setHooksPaths(path) {
    this.hooksPath = path
  }

  // ------------------------------------------------------------------------------------------
  // Protected functions

  /**
   * @protected
   */
  _writeQueryFiles() {
    global.LOG('Writing queryInputs.js file')
    // next we create the query definition file
    fs.writeFileSync(
      path.join(this.outputDirectory, 'queryInputs.js'),
      Mustache.render(
        fs
          .readFileSync(
            path.join(__dirname, '..', 'templates', 'genericModule.txt'),
          )
          .toString(),
        {
          importsStr: '',
          exportStr: `{\n${this.models
            .map(m =>
              m.queries.map(q => `  ${q.toQueryParamDefinition()}`).join(',\n'),
            )
            .join(',\n')}\n}`,
        },
      ),
      {flag: 'w'},
    )
  }

  /**
   * @protected
   */
  _writeDynamicStaticTypes() {
    const inputTypeNames = Object.keys(this.inputTypes)
    global.LOG(
      `Writing ${inputTypeNames.length} Input types to dynamicTypes.js`,
    )

    fs.writeFileSync(
      path.join(this.outputDirectory, 'dynamicTypes.js'),
      inputTypeNames
        .map(name => {
          global.LOG(`Writing ${name} type:`, this.inputTypes[name])
          return Mustache.render(
            fs
              .readFileSync(
                path.join(__dirname, '..', 'templates', 'typeDefinition.txt'),
              )
              .toString(),
            {
              typeName: name,
              propertiesStr: Object.entries(this.inputTypes[name])
                .map(([param, type]) => {
                  const isRequired = type.includes('!')
                  return `  @property {${convertDynamoTypeToJSDoc(
                    type.replace('!', ''),
                  )}${isRequired ? '' : '?'}} ${param}`
                })
                .join('\n'),
            },
          )
        })
        .join('\n\n'),
      {flag: 'w'},
    )
  }

  /**
   * @protected
   */
  _writeCollectionFiles() {
    // create our collections folder
    fs.mkdirSync(path.join(this.outputDirectory, 'collections'))

    global.LOG(`Created collections folder`)

    const hasHooks = !!this.hooksPath
    const collectionsIndexFile = hasHooks
      ? 'collectionsIndex.txt'
      : 'collectionsIndexNoHooks.txt'

    global.LOG(`Using collections/index template ${collectionsIndexFile}`)

    // First we build the models folder index file
    fs.writeFileSync(
      path.join(this.outputDirectory, 'collections', 'index.js'),
      Mustache.render(
        fs
          .readFileSync(
            path.join(__dirname, '..', 'templates', collectionsIndexFile),
          )
          .toString(),
        Object.assign(
          {
            importsStr: this.models
              .map(
                m =>
                  `const ${m.getCollectionName()} = require('./${m.getCollectionName()}.js')`,
              )
              .join('\n'),
            collectionNames: this.models
              .map(m => `  ${m.getCollectionName()}`)
              .join(',\n'),
          },
          hasHooks
            ? {
                setHooksForCollections: this.models
                  .map(m => {
                    return `    if (customHooks['${
                      m.name
                    }']) { Object.keys(customHooks['${
                      m.name
                    }']).forEach(h => {${m.getCollectionName()}['custom_'+h] = customHooks['${
                      m.name
                    }'][h]}) } `
                  })
                  .join('\n'),
              }
            : undefined,
        ),
      ),
      {flag: 'w'},
    )

    global.LOG(`Created collections/index.js`)

    // next we create each individual model file
    this.models.forEach(m => this._writeSingleCollectionFile(m))
  }

  /**
   * @param {GeneratedModel} model
   * @protected
   */
  _writeSingleCollectionFile(model) {
    const collectionPath = path.join(
      this.outputDirectory,
      'collections',
      model.getCollectionName() + '.js',
    )
    global.LOG(`Writing ${model.name} to ${collectionPath}`)
    // Here we build each model's collection module
    fs.writeFileSync(
      collectionPath,
      Mustache.render(
        fs
          .readFileSync(
            path.join(__dirname, '..', 'templates', 'collection.txt'),
          )
          .toString(),
        {
          modelName: model.name,
          collectionName: model.getCollectionName(),
          connectionsMap: JSON.stringify(model.connections),
          queryDefinitions: model.queries
            .map(def => def.toFunctionDefinition(model.getCollectionName()))
            .join('\n'),
          fragmentsStr: model
            .getFragmentDefinitions(this.modelsLookup)
            .join('\n'),
        },
      ),
      {flag: 'w'},
    )
  }

  /**
   * @protected
   */
  _copySrcFiles() {
    global.LOG(`Copy src files to build folder`)
    const srcDir = path.join(__dirname, '..', 'src')
    const files = fs.readdirSync(srcDir)
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i]

      // copy our AbstractCollection.js file into the collections build folder
      const outputFileName =
        fileName === 'AbstractCollection.js'
          ? path.join('collections', fileName)
          : fileName

      fs.copyFileSync(
        path.join(srcDir, fileName),
        path.join(this.outputDirectory, outputFileName),
      )
      global.LOG(`Copied ${fileName} to ${outputFileName}`)
    }
  }

  /**
   * @private
   */
  _copyHooksFile() {
    global.LOG(`Copying custom hooks to output folder`)
    fs.copyFileSync(
      this.hooksPath,
      path.join(this.outputDirectory, 'customHooks.js'),
    )
    global.LOG(`Copied custom hooks file`)
  }

  // ------------------------------------------------------------------------------------------
  // Static functions

  /**
   * @param {string} srcSchemaPath
   * @param {string} builtSchemaPath
   * @param {CustomFragmentsDefinition} fragments
   * @return {OutputDefinition}
   */
  static getFromSchema(srcSchemaPath, builtSchemaPath, fragments) {
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

      const customFragmentNames = modelFragments && Object.keys(modelFragments)
      if (customFragmentNames) {
        global.LOG(
          `Found ${customFragmentNames.length} fragments to add`,
          modelFragments,
        )
        Object.entries(modelFragments).forEach(([name, definition]) =>
          m.addFragment(name, definition),
        )
      } else {
        global.LOG(`No custom fragments to add`)
      }
    })

    const inputTypes = getInputTypeDefinitions(builtSchemaStr)

    return new OutputDefinition(models, inputTypes)
  }
}

module.exports = OutputDefinition
