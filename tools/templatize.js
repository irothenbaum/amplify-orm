const fs = require("fs")
const path = require("path")
const Mustache = require("mustache")

let instance

class Templatize {
  constructor() {
    if (instance) {
      throw new Error("Templatize is a singleton")
    }
    instance = this
    this._templateCache = {}
  }

  /**
   * @param {string} templateName
   * @param {*} params
   */
  render(templateName, params) {
    return Mustache.render(this.getTemplateStr(templateName), params)

  }

  /**
   * @param {string} templateName
   * @returns {string}
   */
  getTemplateStr(templateName) {
    if (!this._templateCache[templateName]) {
      const templatePath = Templatize.getTemplateFilePath(templateName)
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Cannot find template file named ${templateName}`)
      }

      this._templateCache[templateName] = fs.readFileSync(templatePath).toString()
    }
    return this._templateCache[templateName]
  }

  static Instance() {
    if (!instance) {
      new Templatize()
    }
    return instance
  }

  /**
   * @param {string} fileName
   * @returns {string}
   */
  static getTemplateFilePath(fileName) {
    return path.join(Templatize.TEMPLATE_PATH, fileName)

  }
}

Templatize.TEMPLATE_PATH = path.join(__dirname, '..', 'templates')

module.exports = Templatize
