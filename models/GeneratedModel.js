const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')

class GeneratedModel {
  /**
   * @param {string} name
   * @param {Array<string>} fields // TODO: This is just an array of field names, do we need field Types?
   * @param {Object<string, string>} connections
   */
  constructor(name, fields, connections) {
    global.LOG(
      `Generating model ${name} with inputs:`,
      name,
      fields,
      connections,
    )

    this.name = name

    this.connections = connections
    const connectionFields = Object.keys(this.connections)
    this.allFields = fields
    this.primitiveFields = fields.filter(f => !connectionFields.includes(f))

    /** @type {Array<QueryDefinition>} */
    this.queries = []

    const defaultFragmentName = `FragmentDefault`
    /** @type {Object<string, Array<FragmentField>>} */
    this.fragments = {
      // start off with the default fragment
      [defaultFragmentName]: this.primitiveFields,
    }

    /** @type {Object<string, function>} hook:function */
    this.hooks = {}
  }

  /**
   * @returns {string}
   */
  getCollectionName() {
    return this.name
  }

  /**
   * @param {QueryDefinition} def
   */
  addQueryDefinition(def) {
    global.LOG(`Adding ${def.queryName} (${def.type}) to ${this.name} model`)
    this.queries.push(def)
  }

  /**
   * @param {string} fragmentName
   * @param {Array<FragmentField>} definition
   */
  addFragment(fragmentName, definition) {
    global.LOG(
      `Adding ${fragmentName} to ${this.name} model, ${definition.length} fields`,
    )
    const invalidDefinitions = []
    definition.forEach(f => {
      if (typeof f === 'string') {
        if (!this.allFields.includes(f)) {
          invalidDefinitions.push(f)
        }
      } else {
        Object.keys(f).forEach(con => {
          if (!this.allFields.includes(con)) {
            invalidDefinitions.push(con)
          }
        })
      }
    })

    if (invalidDefinitions.length > 0) {
      throw new Error(
        `Unknown field(s) in fragment definition: [${invalidDefinitions.join(
          ', ',
        )}]`,
      )
    }

    this.fragments[fragmentName] = definition
  }

  /**
   * @param {string} hookName
   * @param {function} func
   */
  addHook(hookName, func) {
    // TODO: this won't work right I don't think ..
    //  (because we somehow need to stringify the function?)
    this.hooks[hookName] = func
  }

  /**
   * @param {Object<string, GeneratedModel>} allModels
   * @returns {Array<string>}
   */
  getFragmentDefinitions(allModels) {
    return Object.entries(this.fragments).map(([fragmentName, fields]) => {
      // we return the fragmentConstant definition to be used in Collection
      return Mustache.render(
        fs
          .readFileSync(
            path.join(__dirname, '..', 'templates', 'fragmentConstant.txt'),
          )
          .toString(),
        {
          fragmentGQL: Mustache.render(
            fs
              .readFileSync(
                path.join(__dirname, '..', 'templates', 'fragmentGQL.txt'),
              )
              .toString(),
            {
              // the actual graphql fragment prepends the model name
              fragmentName: `${this.name}${fragmentName}`,
              modelName: this.name,
              fieldsList: fieldsListToString(this.name, fields, allModels),
            },
          ),
          collectionName: this.getCollectionName(),
          fragmentName: fragmentName,
        },
      )
    })
  }
}

/**
 * @param {string} modelName
 * @param {Array<FragmentField>} fieldsList
 * @param {Object<string, GeneratedModel>} allModels
 * @param {number} depth
 * @returns {string}
 */
function fieldsListToString(modelName, fieldsList, allModels, depth = 1) {
  let spaces = getSpacesFromDepth(depth)

  global.LOG(`Building fields list with inputs:`, modelName, fieldsList, depth)

  return fieldsList
    .map(f => {
      if (typeof f === 'string') {
        return `${spaces}${f}`
      } else {
        const fieldNames = Object.keys(f)
        if (fieldNames.length === 0) {
          throw new Error('Missing field name(s) for complex FieldDefinition')
        }

        return fieldNames
          .map(connectionName => {
            const connectionType =
              allModels[modelName].connections[connectionName]

            // if it starts with a [, then we need to build an items/list sub query
            if (connectionType[0] === '[') {
              const connectionTypeSingle = connectionType.slice(1, -1)
              const extraSpaces = getSpacesFromDepth(depth + 1)
              return `${spaces}${connectionName} {\n${extraSpaces}items {\n${fieldsListToString(
                connectionTypeSingle,
                f[connectionName],
                allModels,
                depth + 2,
              )}\n${extraSpaces}}\n${extraSpaces}nextToken\n${spaces}}`
            } else {
              return `${spaces}${connectionName} {\n${fieldsListToString(
                connectionType,
                f[connectionName],
                allModels,
                depth + 1,
              )}\n${spaces}}`
            }
          })
          .join('\n')
      }
    })
    .join('\n')
}

/**
 * @param {number} depth -- 0 = 0 spaces
 * @returns {string}
 */
function getSpacesFromDepth(depth) {
  let spaces = ''

  for (let i = 0; i < depth; i++) {
    spaces += '  '
  }
  return spaces
}

module.exports = GeneratedModel
