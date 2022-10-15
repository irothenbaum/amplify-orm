class GQLQueryIterator {
  /**
   * @param {function} nextFunc
   */
  constructor(nextFunc) {
    this.nextToken = undefined
    this.hasCompleted = false
    this.next = nextFunc.bind(this)
  }
}

module.exports = GQLQueryIterator
