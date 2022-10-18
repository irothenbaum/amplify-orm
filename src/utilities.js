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
 * @param {string} queryName
 * @returns {string[][]}
 */
function getInputStrings(queryName) {
  const inputs = queries[queryName]

  if (!inputs) {
    throw new Error(
      `Missing param definition for query/mutation named '${queryName}'`,
    )
  }

  const inputsTopLevel = []
  const inputsInner = []
  Object.entries(inputs).forEach(tuple => {
    inputsTopLevel.push(`$${tuple[0]}:${tuple[1]}`)
    inputsInner.push(`${tuple[0]}:$${tuple[0]}`)
  })

  return [inputsTopLevel, inputsInner]
}

module.exports = {
  capitalize,
  pluralizeCollection,
  getInputStrings,
}
