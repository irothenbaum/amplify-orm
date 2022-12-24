const {primitiveTypes} = require('../tools/types')
const Templatize = require('../tools/templatize')

class GeneratedModel {
  /**
   * @param {string} name
   * @param {Object<string, string>} fields // all the fields and their types as k:v pairs
   */
  constructor(name, fields) {
    global.LOG(`Generating model ${name} with inputs:`, name, fields)

    this.name = name

    this.fields = fields
    this.allFields = Object.keys(fields)
    this.primitiveFields = []
    this.complexFields = []

    this.allFields.forEach(f => {
      // ignore if it's required or not when determining if its primitive
      primitiveTypes.includes(fields[f].replace('!', '')) ? this.primitiveFields.push(f) : this.complexFields.push(f)
    })

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
    global.LOG(`Adding ${fragmentName} to ${this.name} model, ${definition.length} fields`)
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
      throw new Error(`Unknown field(s) in fragment definition: [${invalidDefinitions.join(', ')}]`)
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
    return Object.entries(this.fragments).map(
      ([fragmentName, fields]) => {
        // we return the fragmentConstant definition to be used in Collection
        return Templatize.Instance().render(
          'fragmentConstant.txt',
          {
            fragmentGQL: Templatize.Instance().render(
              'fragmentGQL.txt',
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
      }
    )
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

        return fieldNames.map(connectionName => {
          console.log(modelName, connectionName, allModels[modelName])
          const connectionType = allModels[modelName].fields[connectionName]


          // if it starts with a [, then we need to build an items/list sub query
          if (connectionType[0] === '[') {
            const connectionTypeSingle = connectionType.slice(1, -1)
            const extraSpaces = getSpacesFromDepth(depth + 1)
            return `${spaces}${connectionName} {\n${extraSpaces}items {\n${fieldsListToString(connectionTypeSingle, f[connectionName], allModels, depth + 2)}\n${extraSpaces}}\n${extraSpaces}nextToken\n${spaces}}`

          } else {
            return `${spaces}${connectionName} {\n${fieldsListToString(connectionType, f[connectionName], allModels, depth + 1)}\n${spaces}}`
          }

        }).join('\n')
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
