const fs = require("fs")
const path = require("path")
const Mustache = require("mustache")

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates')
const _templateCache = {}

/**
 * @param {string} templateName
 * @param {*} params
 */
function render(templateName, params) {
  return Mustache.render(getTemplateStr(templateName), params)
}

/**
 * @param {string} templateName
 * @returns {string}
 */
function getTemplateStr(templateName) {
  if (!_templateCache[templateName]) {
    const templatePath = getTemplateFilePath(templateName)
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Cannot find template file named ${templateName}`)
    }

    _templateCache[templateName] = fs.readFileSync(templatePath).toString()
  }
  return _templateCache[templateName]
}

/**
 * @param {string} fileName
 * @returns {string}
 */
function getTemplateFilePath(fileName) {
  return path.join(TEMPLATE_PATH, fileName)

}

module.exports = {
  render,
  getTemplateFilePath,
}
