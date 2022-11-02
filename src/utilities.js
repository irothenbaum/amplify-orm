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

module.exports = {
  capitalize,
  pluralizeCollection,
}
