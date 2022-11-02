const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')

class GeneratedModel {
  /**
   * @param {string} name
   * @param {Array<string>} fields // TODO: Field Types?
   * @param {Object<string, string>} connections
   */
  constructor(name, fields, connections) {
    this.name = name

    // TODO: By default, the fields will include connections, but it probably shouldn't so we can avoid the multi-level nesting
    //  Maybe by default the default fragment only has non-connection fields?

    this.allFields = fields
    this.connections = connections

    /** @type {Array<QueryDefinition>} */
    this.queries = []

    const defaultFragmentName = `Fragment${this.name}Complete`
    /** @type {Object<string, Array<FragmentField>>} */
    this.fragments = {
      // start off with the default fragment
      defaultFragmentName: this.toFragment(defaultFragmentName, this.allFields),
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
    this.queries.push(def)
  }

  /**
   * @param {string} fragmentName
   * @param {Array<FragmentField>} definition
   */
  addFragment(fragmentName, definition) {
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
   * @param {string} name
   * @param {Array<FragmentField>} fieldsList
   */
  toFragment(name, fieldsList) {
    const fragmentGQL = Mustache.render(
      fs.readFileSync(
        path.join(__dirname, '..', 'templates', 'fragmentGQL.txt'),
      ).toString(),
      {
        fragmentName: name,
        modelName: this.name,
        fieldsList: fieldsListToString(fieldsList),
      },
    )

    // we return the fragmentConstant definition to be used in Collection
    return Mustache.render(
      fs.readFileSync(
        path.join(__dirname, '..', 'templates', 'fragmentConstant.txt'),
      ).toString(),
      {
        fragmentGQL: fragmentGQL,
        collectionName: this.getCollectionName(),
        fragmentName: name,
      },
    )
  }
}

/**
 * @param {Array<FragmentField>} fieldsList
 * @returns {string}
 */
function fieldsListToString(fieldsList) {
  return fieldsList
    .map(f => {
      if (typeof f === 'string') {
        return f
      } else {
        const fieldName = Object.keys(f)[0]
        if (!fieldName) {
          throw new Error('Missing field name for complex FieldDefinition')
        }
        return `${fieldName} {${fieldsListToString(f[fieldName])}`
      }
    })
    .join('\n')
}

module.exports = GeneratedModel
