const path = require('path')
const OutputDefinition = require('../models/OutputDefinition')

async function build() {
  const pathToSchema = path.join(process.cwd(), process.argv[2])
  console.log('Loading from ' + pathToSchema)
  OutputDefinition.getFromSchema(pathToSchema)
}

build()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
