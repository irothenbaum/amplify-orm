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
      ].includes(type)
    ) {
      throw new Error('Invalid type ' + type)
    }

    this.type = type
    this.queryName = queryName
    this.params = params
  }

  /**
   * @param {string} collectionName
   * @returns {string}
   */
  toFunctionDefinition(collectionName) {
    return Mustache.render(
      fs.readFileSync(
        path.join(__dirname, '..', 'templates', 'queryFunctionDefinition.txt'),
      ),
      {
        collectionName: collectionName,
        functionName: this.queryName,
        inputType: `{${Object.entries(this.params).reduce(
          (agr, [param, type]) => {
            return agr + `${param}: ${type}\n`
          },
          '',
        )}}`,
        internalFunction: typeToInternalFunction[this.type],
      },
    )
  }
}

QueryDefinition.TYPE_MUTATION = 'mutate'
QueryDefinition.TYPE_QUERY_LIST = 'list'
QueryDefinition.TYPE_QUERY_ONE = 'get'

// these are the respective AbstractCollection function that this query type maps to
const typeToInternalFunction = {
  [QueryDefinition.TYPE_MUTATION]: '_mutate',
  [QueryDefinition.TYPE_QUERY_LIST]: '_list',
  [QueryDefinition.TYPE_QUERY_ONE]: '_get',
}

module.exports = QueryDefinition
