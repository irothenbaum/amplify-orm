const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')

class GeneratedModel {
  /**
   * @param {string} name
   * @param {Array<string>} fields
   * @param {Object<string, string>} connections
   */
  constructor(name, fields, connections) {
    this.name = name
    this.allFields = fields
    this.connections = connections
    this.queries = []
  }

  /**
   * @param {QueryDefinition} def
   */
  addQueryDefinition(def) {
    this.queries.push(def)
  }

  /**
   * @param {string?} name
   * @param {string?} fieldsList
   */
  toFragment(name, fieldsList) {
    return Mustache.render(
      fs.readFileSync(path.join(__dirname, '..', 'templates', 'fragment.txt')),
      {
        fragmentName: name || `Fragment${this.name}Default`,
        modelName: this.name,
        fieldsList: (fieldsList || this.allFields).join('\n'),
      },
    )
  }
}

module.exports = GeneratedModel
