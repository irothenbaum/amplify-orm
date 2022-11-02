const path = require('path')
const fs = require('fs')
const OutputDefinition = require('../models/OutputDefinition')

let verbose = false
global.LOG = function() {
  if (verbose) {
    console.log.apply(console, arguments)
  }
}

async function build() {
  const configPath = path.join(process.cwd(), process.argv[2])
  console.log(`Loading config from: "${configPath}"`)
  const config = require(configPath)

  verbose = !!config.debug

  const baseDir = path.dirname(configPath)

  const def = OutputDefinition.getFromSchema(
    path.join(baseDir, config.srcSchema),
    path.join(baseDir, config.buildSchema),
    config.fragments,
    config.hooks,
  )

  global.LOG(`Built OutputDefinition:`, def)

  const outputDir = path.join(process.cwd(), process.argv[3])

  console.log('Built, writing to ' + outputDir)

  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, {recursive:true,force:true})
  }

  fs.mkdirSync(outputDir)

  def.writeFiles(outputDir)
}

build()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
