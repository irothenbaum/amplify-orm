const Templatize = require("../tools/templatize");

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
      if (this.queryName.includes('list')) {
        return this.queryName.replace('list', 'iterate')
      } else {
        return `iterate${this.queryName}`
      }
    }
    return this.queryName
  }

  /**
   * @param {string} collectionName
   * @returns {string}
   */
  toFunctionDefinition(collectionName) {
    global.LOG(`Generating function definition ${this.getFunctionName()} for query ${this.queryName}`)

    // if any params are required, then the input object is required
    const inputIsRequired = Object.values(this.params).some(type => type.includes('!'))

    return Templatize.render(
      'queryFunctionDefinition.txt',
      {
        collectionName: collectionName,
        functionName: this.getFunctionName(),
        queryName: this.queryName,
        inputType: `{${Object.entries(this.params).map(
          ([param, type]) => {
            const isRequired = type.includes('!')
            
            return `${param}${isRequired ? '' : '?'}: ${type.replace('!', '')}`
          },
        ).join(', ')}}${inputIsRequired ? '' : '?'}`,
        internalFunction: typeToInternalFunction[this.type],
        returnType: typeToReturnType[this.type],
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

const typeToReturnType = {
  [QueryDefinition.TYPE_MUTATION]: '*',
  [QueryDefinition.TYPE_QUERY_LIST]: 'Array<*>',
  [QueryDefinition.TYPE_QUERY_ONE]: '*',
  [QueryDefinition.TYPE_QUERY_ITERATIVE]: 'GQLQueryIterator',
}

module.exports = QueryDefinition
