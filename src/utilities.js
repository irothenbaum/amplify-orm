/**
 * @param {string} str
 * @returns {*}
 */
function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1)
}

/**
 * @param {string} str
 * @returns {string}
 */
function pluralizeCollection(str) {
  // I think this is all AppSync does? lol
  return str + 's'
}

/**
 * @param {string} fieldType
 * @returns {string}
 */
function getModelFromFieldType(fieldType) {
  if (fieldType[0] === '[') {
    return fieldType.slice(-1, 1)
  }
  return fieldType
}

module.exports = {
  capitalize,
  pluralizeCollection,
  getModelFromFieldType,
}
