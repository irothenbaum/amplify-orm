const fs = require('fs')
const path = require('path')
const Templatize = require('../tools/templatize')
const {convertDynamoTypeToJSDoc} = require('../tools/types')
const {
  loadSchemaToString,
  schemaToModels,
  addQueriesToModels,
  getInputTypeDefinitions,
  findEnumsInSchema,
} = require('../tools/schemaParsing')
const QueryDefinition = require("../models/QueryDefinition")

class OutputDefinition {
  /**
   * @param {Array<GeneratedModel>} models
   * @param {Object<string, Object<string, string>>} inputTypes
   * @param {Object<string, Array<string>>} enums
   */
  constructor(models, inputTypes, enums) {
    models.sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    this.models = models
    this.modelsLookup = models.reduce((agr, m) => {
      agr[m.name] = m
      return agr
    }, {})
    this.inputTypes = inputTypes
    this.knownEnums = enums
  }

  /**
   * @param {boolean} b
   */
  setUseEMS(b) {
    this.useESM = b
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

    this._generateSrcFiles()
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
      this._renderModule({}, '', this.models
        .reduce((agr, m) =>
          // do not include iterative queries since they're redundant to the list ones
          agr.concat(m.queries.filter(q => q.type !== QueryDefinition.TYPE_QUERY_LIST).map(q => q.toQueryParamDefinition()))
        , [])
      ),
      {flag: 'w'},
    )
  }

  /**
   * @protected
   */
  _writeDynamicStaticTypes() {
    const inputTypeNames = Object.keys(this.inputTypes)
    const enumNames = Object.keys(this.knownEnums)
    global.LOG(
      `Writing ${inputTypeNames.length} Input types to dynamicTypes.js`,
    )

    fs.writeFileSync(
      path.join(this.outputDirectory, 'dynamicTypes.js'),
      inputTypeNames.map(name => {
        global.LOG(`Writing ${name} type:`, this.inputTypes[name])
        return Templatize.Instance().render(
          'typeDefinition.txt',
          {
            typeName: name,
            properties: Object.entries(this.inputTypes[name]).map(([param, type]) => {
              const isRequired = type.includes('!')
              return {
                type: convertDynamoTypeToJSDoc(type.replace('!', '')),
                isRequired: isRequired,
                param: param
              }
            })
          },
        )
      }).concat(enumNames.map(name => {
        global.LOG(`Writing ${name} enum:`, this.knownEnums[name])
        return Templatize.Instance().render(
          'enumDefinition.txt',
          {
            enumName: name,
            enumValues: this.knownEnums[name]
          },
        )
      })).join('\n\n'),
      {flag: 'w'}
    )
  }

  /**
   * @protected
   */
  _writeCollectionFiles() {
    // create our collections folder
    fs.mkdirSync(path.join(this.outputDirectory, 'collections'))

    global.LOG(`Created collections folder`)

    // First we build the models folder index file
    fs.writeFileSync(
      path.join(this.outputDirectory, 'collections', 'index.js'),
      this._renderModule({
        GraphQLHelper: '../GQLQueryHelper',
        ...(this.hooksPath ? {customHooks: '../customHooks'} : {}), // only load custom hooks if we have them
          ...this.models
            .reduce((agr, m) => {
              agr[m.getCollectionName()] = `./${m.getCollectionName()}`
              return agr
            }, {})
      }, Templatize.Instance().render(
          'collectionsIndex.txt',
          Object.assign(
            {
              collectionNames: this.models
                .map(m => m.getCollectionName()),
              initDefinition: this.getInitDefinition(!!this.hooksPath)
            },
          ),
        ),
        [
          '...allCollections',
          'modelNameToCollectionMap',
          'init'
        ],
      ), {flag: 'w'})


    global.LOG(`Created collections/index.js`)

    // next we create each individual model file
    this.models.forEach(m => this._writeSingleCollectionFile(m))
  }

  /**
   * @param {boolean} hasHooks
   * @returns {string}
   */
  getInitDefinition(hasHooks) {
    return Templatize.Instance().render('initDefinition.txt', {
      setHooksForCollections: hasHooks ? this.models
        .map(m => {
          return `  if (customHooks['${
            m.name
          }']) { Object.keys(customHooks['${
            m.name
          }']).forEach(h => {${m.getCollectionName()}['custom_'+h] = customHooks['${
            m.name
          }'][h]}) } `
        })
        .join('\n') : '  // No custom hooks defined',
    })

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
      this._renderModule({
          AbstractCollection: './AbstractCollection',
          'utilities': '../utilities',
        },
      Templatize.Instance().render(
        'collection.txt',
        {
          modelName: model.name,
          collectionName: model.getCollectionName(),
          complexFieldsMap: JSON.stringify(model.complexFields.reduce((agr, f) => {
            agr[f] = model.fields[f]
            return agr
          }, {})),
          jsonFields: model.jsonFields,
          queryDefinitions: model.queries
            .map(def => def.toFunctionDefinition(model.getCollectionName()))
            .join('\n'),
          fragmentsStr: model
            .getFragmentDefinitions(this.modelsLookup)
            .join('\n'),
        },
      ),
        model.getCollectionName()
      ,
    ), {flag: 'w'})
  }

  /**
   * These files are ready to go, just need to have their imports/exports generated according to ESM setting
   * @protected
   */
  _generateSrcFiles() {
    global.LOG(`Generating src files and saving to build folder`)

    // --------------------------------------------------------------------------------------------------

    // first write Abstract Collection
    global.LOG(`Writing AbstractCollection model`)

    fs.writeFileSync(
      path.join(
        this.outputDirectory,
        'collections',
        'AbstractCollection.js',
      ),
      this._renderModule(
        {GQLQueryHelper: '../GQLQueryHelper', queries: '../queryInputs', 'utilities': '../utilities'},
        fs.readFileSync(Templatize.getTemplateFilePath('AbstractCollection.txt')).toString(),
        'AbstractCollection'),
      {flag: 'w'}
    )

    // --------------------------------------------------------------------------------------------------

    // Next, write the GQLHelper
    global.LOG(`Writing GQLQueryHelper model`)
    fs.writeFileSync(
      path.join(
        this.outputDirectory,
        'GQLQueryHelper.js',
      ),
      this._renderModule(
        {gql: 'graphql-tag', GQLResponse: './GQLResponse', GQLQueryIterator: './GQLQueryIterator'},
        fs.readFileSync(Templatize.getTemplateFilePath('GQLQueryHelper.txt')).toString(),
        'GQLQueryHelper'),
      {flag: 'w'}
    )

    // --------------------------------------------------------------------------------------------------

    // Next, write the GQLIterator
    global.LOG(`Writing GQLQueryIterator model`)
    fs.writeFileSync(
      path.join(
        this.outputDirectory,
        'GQLQueryIterator.js',
      ),
      this._renderModule(
        {},
        fs.readFileSync(Templatize.getTemplateFilePath('GQLQueryIterator.txt')).toString(),
        'GQLQueryIterator'),
      {flag: 'w'}
    )

    // --------------------------------------------------------------------------------------------------

    // Next, write the GQLResponse
    global.LOG(`Writing GQLResponse model`)
    fs.writeFileSync(
      path.join(
        this.outputDirectory,
        'GQLResponse.js',
      ),
      this._renderModule(
        {},
        fs.readFileSync(Templatize.getTemplateFilePath('GQLResponse.txt')).toString(),
        'GQLResponse'),
      {flag: 'w'}
    )


    // --------------------------------------------------------------------------------------------------

    // Last, write utilities
    global.LOG(`Writing utilities library`)
    fs.writeFileSync(
      path.join(
        this.outputDirectory,
        'utilities.js',
      ),
      this._renderModule(
        {},
        fs.readFileSync(Templatize.getTemplateFilePath('utilities.txt')).toString(),
        [
          'capitalize',
          'pluralizeCollection',
          'getModelFromFieldType',
        ]),
      {flag: 'w'}
    )
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

  /**
   * @param {Object<string, string>} imports
   * @param {string} code
   * @param {string|Array<string>} exports
   * @returns {string}
   * @private
   */
  _renderModule(imports, code, exports) {
    global.LOG(`Creating module with imports/exports`, imports, exports)
    return Templatize.Instance().render('genericModule.txt', {
        importsStr: this._getImportDefinition(imports),
        code: code,
        exportStr: this._getExportDefinition(exports)
      }
    )
  }

  /**
   * @param {Object<string, string>} imports
   * @returns {string}
   * @private
   */
  _getImportDefinition(imports) {
    const func = this.useESM ? (name, library) => `import ${name} from '${library}'` : (name, library) => `const ${name} = require('${library}')`
    return Object.entries(imports).reduce((agr, tuple) => {
      return `${agr}${func(tuple[0], tuple[1])}\n`
    }, '')
  }

  /**
   * This function assumes if it's a single string then it's a default export
   * @param {string|Array<string>} exports
   * @private
   */
  _getExportDefinition(exports) {
    const exportObj = Array.isArray(exports) ? `{\n  ${exports.join(',\n  ')}\n}` : exports
    return this.useESM ? `export default ${exportObj}` : `module.exports = ${exportObj}`
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

    const enums = findEnumsInSchema(builtSchemaStr)

    // get our basic models
    // TODO: I don't love that we're passing enums down the chain here since it's only needed by the GeneratedModel constructor
    //  but it was the fastest solution to get enums working. Refactor at some point?
    const models = schemaToModels(srcSchemaStr, builtSchemaStr, enums)

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

    return new OutputDefinition(models, inputTypes, enums)
  }
}

module.exports = OutputDefinition
