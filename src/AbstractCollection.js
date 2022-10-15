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

// TODO: inputs is going to be in the form of {param: value}, but it needs to be converted to {param: type}
//  where is this type definition going to come from? And how will it be stored?

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
  /**
   * @param {*?} filter
   * @returns {Promise<Array<*>>}
   */
  listAll(filter) {
    return this._list(`list${this.constructor.name}`, {filter: filter})
  }

  /**
   * @param {string} id
   * @returns {Promise<*>}
   */
  get(id) {
    return this._get(`get${this.constructor.name}`, {id: id})
  }

  /**
   * @param {*} payload
   * @returns {Promise<*>}
   */
  create(payload) {
    return this._mutate(`create${this.constructor.name}`, {input: payload})
  }

  /**
   * @param {*} payload
   * @returns {Promise<*>}
   */
  update(payload) {
    return this._mutate(`update${this.constructor.name}`, {input: payload})
  }

  /**
   * @param {string} id
   * @returns {Promise<*>}
   */
  delete(id) {
    return this._mutate(`delete${this.constructor.name}`, {input: {id: id}})
  }
  // -----------------------------------------------------------------------------------------------------------

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @returns {Promise<Array<*>>}
   * @protected
   */
  _list(queryName, inputs) {
    return GQLQueryHelper.Instance().queryAll(
      this._buildListQuery(queryName, this.fragmentName),
      inputs,
    )
  }

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @returns {Promise<*>}
   * @protected
   */
  _get(queryName, inputs) {
    return GQLQueryHelper.Instance().queryOnce(
      this._buildGetQuery(queryName, this.fragmentName),
      inputs,
    )
  }

  /**
   * @param {string} queryName
   * @param {*} inputs
   * @returns {Promise<*>}
   * @protected
   */
  _mutate(queryName, inputs) {
    return GQLQueryHelper.Instance().executeMutation(
      this._buildMutation(queryName, this.fragmentName),
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

  /**
   * @param {string} fragmentName
   * @returns {AbstractCollection}
   */
  static as(fragmentName) {
    return new AbstractCollection(fragmentName)
  }
}
