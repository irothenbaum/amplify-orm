const path = require('path')
const OutputDefinition = require('../models/OutputDefinition')

async function build() {
  const config = require(path.join(process.cwd(), process.argv[2]))

  config.srcSchema

  const pathToSrcSchema = path.join(
    process.cwd(),
    process.argv[2],
    'schema.graphql',
  )
  const pathToBuiltSchema = path.join(
    process.cwd(),
    process.argv[2],
    'build',
    'schema.graphql',
  )
  console.log('Loading from ' + pathToSrcSchema)

  const def = OutputDefinition.getFromSchema(
    config.srcSchema,
    config.buildSchema,
  )

  console.log(def)

  const outputDir = path.join(process.cwd(), process.argv[3])

  console.log('Built, writing to ' + outputDir)

  def.writeFiles(process.argv[3])
}

build()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
