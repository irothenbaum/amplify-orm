const {API, graphqlOperation} = require('aws-amplify')
const GQLResponse = require('./GQLResponse')
const GQLQueryIterator = require('./GQLQueryIterator')

/**
 * @typedef QueryOptions
 * @property {number} maxIterations
 * @property {number} maxResults
 */

const DEFAULT_PARAMS = {
  nextToken: null,
  limit: 10000,
}
const DEFAULT_MAXIMUM_ITERATIONS = 20
const DEFAULT_MAXIMUM_RESULTS = 1000000

/**
 * @param {*} resp
 * @throws {Error}
 */
function handleQueryException(resp) {
  if (Array.isArray(resp.errors) && resp.errors.length > 0) {
    throw new Error(resp.errors[0].message)
  } else {
    throw resp
  }
}

let instance

class GQLQueryHelper {
  constructor(config) {
    if (instance) {
      throw new Error('GQLQueryHelper is a Singleton')
    }
    API.configure(config)
  }

  /**
   * @returns {GQLQueryHelper}
   */
  static Instance() {
    return instance
  }

  /**
   * @param {string} mutation
   * @param {*} params
   * @returns {Promise<*>}
   */
  async executeMutation(mutation, params) {
    return this.queryOnce(mutation, params)
  }

  /**
   * @param {string} query
   * @param {*?} params
   * @returns {Promise<*>}
   */
  async queryOnce(query, params) {
    try {
      let response = await API.graphql(graphqlOperation(query, params))
      return new GQLResponse(response).payload
    } catch (resp) {
      handleQueryException(resp)
    }
  }

  /**
   * @param {string} query
   * @param {*?} params
   * @param {function?} afterFind
   * @returns {GQLQueryIterator}
   */
  iterativeQuery(query, params, afterFind) {
    return new GQLQueryIterator(async function () {
      if (this.hasCompleted) {
        return []
      }

      try {
        let response = await API.graphql(
          graphqlOperation(query, {
            ...params,
            nextToken: this.nextToken,
          }),
        )
        const resp = new GQLResponse(response)
        this.nextToken = resp.nextToken

        if (!this.nextToken) {
          this.hasCompleted = true
        }

        return typeof afterFind === 'function'
          ? await afterFind(resp.payload)
          : resp.payload
      } catch (resp) {
        handleQueryException(resp)
      }
    })
  }

  /**
   * Will exhaustively search all records until we've gathered maximumResults, executed maximumIterations, or scanned all records
   * @param {string} query
   * @param {*?} params
   * @param {QueryOptions?} options
   * @returns {Promise<Array<*>>}
   */
  async queryAll(query, params, options) {
    let maximumResults =
      (options && options.maxResults) || DEFAULT_MAXIMUM_RESULTS
    let maximumIterations =
      (options && options.maxIterations) || DEFAULT_MAXIMUM_ITERATIONS

    let result = []

    // merge this params with our defaults
    params = Object.assign({}, DEFAULT_PARAMS, params)

    try {
      do {
        // execute our query
        let responseRaw = await API.graphql(graphqlOperation(query, params))
        let response = new GQLResponse(responseRaw)

        // store our items into our results array
        if (response.hasItems()) {
          result = result.concat(response.payload)
        }

        // TODO: In order for nextToken to work, it must be listed as a param to the query definition
        //  we should find some way to check for this before blindly trying to repeat a query which may not
        //  actually be capable to follow nextTokens

        // set our next token
        // eslint-disable-next-line require-atomic-updates
        params.nextToken = response.nextToken

        // decrement our depth counter
        maximumIterations--

        // repeat for as long as there's a next token && we haven't exceeded the max depth && we haven't reached our result count
      } while (
        params.nextToken &&
        maximumIterations > 0 &&
        result.length < maximumResults
      )
    } catch (resp) {
      handleQueryException(resp)
    }
    return result.slice(0, maximumResults)
  }

  // ---------------------------------------------------------------
  // STATIC FUNCTIONS:

  /**
   * @param {*} config
   * @returns {GQLQueryHelper}
   */
  static init(config) {
    return new GQLQueryHelper(config)
  }
}

module.exports = GQLQueryHelper
