class GQLResponse {
  /**
   * @param {*} responseObj
   */
  constructor(responseObj) {
    this.__rawResponse = responseObj

    // we grab the internal query response
    //   -- we don't know what it's called, but we know it's the only prop on the data object
    let wrapperName = Object.keys(responseObj.data)[0]
    let internalResponse = responseObj.data[wrapperName]

    this.nextToken = internalResponse && internalResponse.nextToken
    this.payload = internalResponse
      ? Object.prototype.hasOwnProperty.call(internalResponse, 'items')
        ? // TODO: We should unwrap children
          internalResponse.items
        : internalResponse
      : null
  }

  /**
   * True IFF this response is a list of items
   * @returns {boolean}
   */
  isList() {
    return Array.isArray(this.payload)
  }

  /**
   * True IFF this response is a list of items AND that list is not empty
   * @returns {boolean}
   */
  hasItems() {
    return this.isList() && this.payload.length > 0
  }
}
module.exports = GQLResponse
