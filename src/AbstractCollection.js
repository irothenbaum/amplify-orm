const GQLQueryHelper = require('../GQLQueryHelper')
const queries = require('../queryInputs')
const {capitalize} = require('../utilities')

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
    this.fragmentName = fragmentName || this.constructor.FragmentDefault

    if (!this.fragmentName) {
      throw new Error("Must initialize with a fragment and missing default fragment definition for collection " + this.constructor.name)
    }
  }

  // -----------------------------------------------------------------------------------------------------------
  // Protected functions

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @param {string} fragmentName
   * @param {QueryOptions?} options
   * @returns {Promise<Array<*>>}
   * @protected
   */
  async _list(queryName, inputs, fragmentName, options) {
    const retVal = await GQLQueryHelper.Instance().queryAll(
      this._buildListQuery(queryName, fragmentName),
      inputs,
      options,
    )

    if (typeof this.afterFind === 'function') {
      return retVal.map(r => this.afterFind(r))
    }

    return retVal
  }

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @param {string} fragmentName
   * @param {QueryOptions?} options
   * @returns {Promise<GQLQueryIterator>}
   * @protected
   */
  async _iterate(queryName, inputs, fragmentName, options) {
    // TODO: options?
    return GQLQueryHelper.Instance().iterativeQuery(
      this._buildListQuery(queryName, fragmentName),
      inputs,
      typeof this.afterFind === 'function'
        ? this._afterFind.bind(this)
        : undefined,
    )
  }

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @param {string} fragmentName
   * @param {QueryOptions?} options
   * @returns {Promise<*>}
   * @protected
   */
  async _get(queryName, inputs, fragmentName, options) {
    // TODO: options?
    const retVal = await GQLQueryHelper.Instance().queryOnce(
      this._buildGetQuery(queryName, fragmentName),
      inputs,
    )

    if (typeof this.afterFind === 'function') {
      return this.afterFind(retVal)
    }

    return retVal
  }

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @param {string} fragmentName
   * @param {QueryOptions?} options
   * @returns {Promise<*>}
   * @protected
   */
  async _mutate(queryName, inputs, fragmentName, options) {
    // TODO: options?
    const retVal = await GQLQueryHelper.Instance().executeMutation(
      this._buildMutation(queryName, fragmentName),
      inputs,
    )

    if (typeof this.afterFind === 'function') {
      return this.afterFind(retVal)
    }

    return retVal
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

module.exports = AbstractCollection
