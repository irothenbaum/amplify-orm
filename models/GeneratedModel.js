const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')

class GeneratedModel {
  /**
   * @param {string} name
   * @param {Array<string>} fields
   */
  constructor(name, fields) {
    this.name = name
    this.allFields = fields
  }

  /**
   * @param {string?} name
   * @param {string?} fieldsList
   */
  toFragment(name, fieldsList) {
    return Mustache.render(
      fs.readFileSync(path.join(__dirname, '..', 'templates', 'fragment.txt')),
      {
        fragmentName: name,
        modelName: this.name,
        fieldsList: (fieldsList || this.allFields).join('\n'),
      },
    )
  }
}

module.exports = GeneratedModel
