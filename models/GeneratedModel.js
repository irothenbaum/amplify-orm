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
    global.LOG(`Generating model ${name} with inputs:`, name, fields, connections)

    this.name = name

    this.connectionFields = Object.keys(connections)
    this.allFields = fields
    this.primitiveFields = fields.filter(f => !this.connectionFields.includes(f))

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
    const invalidDefinitions = definition.filter(f => {
      // a connection field will only have one key and that is the field name
      let fieldName = typeof f === 'string' ? f : Object.keys(f)[0]
      return !this.allFields.includes(fieldName)
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
   * @returns {Array<string>}
   */
  getFragmentDefinitions() {
    return Object.entries(this.fragments).map(
      ([fragmentName, fields]) => {
        // we return the fragmentConstant definition to be used in Collection
        return Mustache.render(
          fs.readFileSync(
            path.join(__dirname, '..', 'templates', 'fragmentConstant.txt'),
          ).toString(),
          {
            fragmentGQL: Mustache.render(
              fs.readFileSync(
                path.join(__dirname, '..', 'templates', 'fragmentGQL.txt'),
              ).toString(),
              {
                fragmentName: fragmentName,
                modelName: this.name,
                fieldsList: fieldsListToString(fields),
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
 * @param {Array<FragmentField>} fieldsList
 * @param {number} depth
 * @returns {string}
 */
function fieldsListToString(fieldsList, depth = 0) {
  let spaces = '  '

  for (let i = 0; i < depth; i++) {
    spaces += '  '
  }

  return fieldsList
    .map(f => {
      if (typeof f === 'string') {
        return `${spaces}${f}`
      } else {
        const fieldName = Object.keys(f)[0]
        if (!fieldName) {
          throw new Error('Missing field name for complex FieldDefinition')
        }
        return `${spaces}${fieldName} {\n${fieldsListToString(f[fieldName], depth + 1)}\n}`
      }
    })
    .join('\n')
}

module.exports = GeneratedModel
