const GQLQueryHelper = require('./GQLQueryHelper')
const fragments = require('./fragments')
const queries = require('./queries')
const {capitalize, pluralizeCollection} = require('./utilities')

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

class AbstractCollection {
  /**
   * @param {string?} fragmentName
   */
  constructor(fragmentName) {
    this.fragmentName = fragmentName || fragments[this.constructor.name].DEFAULT
  }

  // -----------------------------------------------------------------------------------------------------------
  // the default queries that we know AppSync generates
  // -----------------------------------------------------------------------------------------------------------
  // /**
  //  * @param {*?} inputs
  //  * @returns {Promise<*>}
  //  */
  // listAll(inputs) {
  //   return this._list(`list${this.constructor.name}`, inputs, this.fragmentName)
  // }
  //
  // /**
  //  * @param {*} inputs
  //  * @returns {Promise<*>}
  //  */
  // get(inputs) {
  //   return this._get(`get${this.constructor.name}`, inputs, this.fragmentName)
  // }
  //
  // /**
  //  * @param {*} inputs
  //  * @returns {Promise<*>}
  //  */
  // create(inputs) {
  //   return this._mutate(
  //     `create${this.constructor.name}`,
  //     inputs,
  //     this.fragmentName,
  //   )
  // }
  //
  // /**
  //  * @param {*} inputs
  //  * @returns {Promise<*>}
  //  */
  // update(inputs) {
  //   return this._mutate(
  //     `update${this.constructor.name}`,
  //     inputs,
  //     this.fragmentName,
  //   )
  // }
  //
  // /**
  //  * @param {*} inputs
  //  * @returns {Promise<*>}
  //  */
  // delete(inputs) {
  //   return this._mutate(
  //     `delete${this.constructor.name}`,
  //     inputs,
  //     this.fragmentName,
  //   )
  // }

  // -----------------------------------------------------------------------------------------------------------
  // Protected functions

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @param {string} fragmentName
   * @returns {Promise<Array<*>>}
   * @protected
   */
  _list(queryName, inputs, fragmentName) {
    return GQLQueryHelper.Instance().queryAll(
      this._buildListQuery(queryName, fragmentName),
      inputs,
    )
  }

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @param {string} fragmentName
   * @returns {Promise<*>}
   * @protected
   */
  _get(queryName, inputs, fragmentName) {
    return GQLQueryHelper.Instance().queryOnce(
      this._buildGetQuery(queryName, fragmentName),
      inputs,
    )
  }

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @param {string} fragmentName
   * @returns {Promise<*>}
   * @protected
   */
  _mutate(queryName, inputs, fragmentName) {
    return GQLQueryHelper.Instance().executeMutation(
      this._buildMutation(queryName, fragmentName),
      inputs,
    )
  }

  /**
   * @param {string} queryName
   * @param {string} fragment
   * @returns {string}
   * @private
   */
  _buildListQuery(queryName, fragment) {
    const [inputsTopLevel, inputsInner] = getInputStrings(queryName)

    return `
      ${fragment}
      query ${capitalize(queryName)}(${inputsTopLevel.join(', ')}) {
        ${queryName}(${inputsInner.join(', ')}) {
          items {
            ...${fragment}
          }
          nextToken
        }
      }
    `
  }

  /**
   * @param {string} queryName
   * @param {string} fragment
   * @returns {string}
   * @protected
   */
  _buildGetQuery(queryName, fragment) {
    const [inputsTopLevel, inputsInner] = getInputStrings(queryName)

    return `
      ${fragment}
      query ${capitalize(queryName)}(${inputsTopLevel.join(', ')}) {
        ${queryName}(${inputsInner.join(', ')}) {
          ...${fragment}
        }
      }
    `
  }

  /**
   * @param {string} queryName
   * @param {string} fragment
   * @returns {string}
   * @protected
   */
  _buildMutation(queryName, fragment) {
    const [inputsTopLevel, inputsInner] = getInputStrings(queryName)

    return `
      ${fragment}
      mutation ${capitalize(queryName)}(${inputsTopLevel.join(', ')}) {
        ${queryName}(${inputsInner.join(', ')}) {
          ...${fragment}
        }
      }
    `
  }

  // -----------------------------------------------------------------------------------------------------------
  // Static functions

  /**
   * @param {string?} fragmentName
   * @returns {AbstractCollection}
   */
  static as(fragmentName) {
    return new this(fragmentName)
  }
}
