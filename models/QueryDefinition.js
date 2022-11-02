const fs = require('fs')
const path = require('path')
const Mustache = require('mustache')

class QueryDefinition {
  /**
   * @param {string} type
   * @param {string} queryName
   * @param {Object<string, string>} params
   */
  constructor(type, queryName, params) {
    if (
      ![
        QueryDefinition.TYPE_MUTATION,
        QueryDefinition.TYPE_QUERY_ONE,
        QueryDefinition.TYPE_QUERY_LIST,
        QueryDefinition.TYPE_QUERY_ITERATIVE,
      ].includes(type)
    ) {
      throw new Error('Invalid type ' + type)
    }

    this.type = type
    this.queryName = queryName
    this.params = params
  }

  /**
   * @returns {string}
   */
  getFunctionName() {
    if (this.type === QueryDefinition.TYPE_QUERY_ITERATIVE) {
      return this.queryName.replace('list', 'iterate')
    }
    return this.queryName
  }

  /**
   * @param {string} collectionName
   * @returns {string}
   */
  toFunctionDefinition(collectionName) {
    global.LOG(`Generating function definition ${this.getFunctionName()} for query ${this.queryName}`)
    return Mustache.render(
      fs.readFileSync(
        path.join(__dirname, '..', 'templates', 'queryFunctionDefinition.txt'),
      ).toString(),
      {
        collectionName: collectionName,
        functionName: this.getFunctionName(),
        queryName: this.queryName,
        inputType: `{${Object.entries(this.params).map(
          ([param, type]) => {
            const isRequired = type.includes('!')
            
            return `${param}${isRequired ? '' : '?'}: ${type.replace('!', '')}`
          },
        ).join(',\n')}}`,
        internalFunction: typeToInternalFunction[this.type],
      },
    )
  }

  /**
   * @returns {string}
   */
  toQueryParamDefinition() {
    return `${this.queryName}:${JSON.stringify(this.params)}`
  }
}

QueryDefinition.TYPE_MUTATION = 'mutate'
QueryDefinition.TYPE_QUERY_LIST = 'list'
QueryDefinition.TYPE_QUERY_ONE = 'get'
QueryDefinition.TYPE_QUERY_ITERATIVE = 'iterative'

// these are the respective AbstractCollection function that this query type maps to
const typeToInternalFunction = {
  [QueryDefinition.TYPE_MUTATION]: '_mutate',
  [QueryDefinition.TYPE_QUERY_LIST]: '_list',
  [QueryDefinition.TYPE_QUERY_ONE]: '_get',
  [QueryDefinition.TYPE_QUERY_ITERATIVE]: '_iterate',
}

module.exports = QueryDefinition
