const path = require('path')
const OutputDefinition = require('../models/OutputDefinition')

async function build() {
  const configPath = path.join(process.cwd(), process.argv[2])
  console.log(configPath)
  const config = require(configPath)

  const def = OutputDefinition.getFromSchema(
    config.srcSchema,
    config.buildSchema,
    config.fragments,
    config.hooks,
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
