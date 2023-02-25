const path = require('path')
const fs = require('fs')
const OutputDefinition = require('../models/OutputDefinition')

let verbose = false
global.LOG = function () {
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
    typeof config.fragments === 'string'
      ? require(path.join(baseDir, config.fragments))
      : config.fragments,
  )

  if (!!config.hooks && typeof config.hooks !== 'string') {
    throw new Error('hooks prop must be a file path')
  }

  if (config.hooks) {
    def.setHooksPaths(path.join(baseDir, config.hooks))
  }

  def.setUseEMS(config.useESM || false)

  global.LOG(`Built OutputDefinition:`, def)

  const outputDir = path.join(process.cwd(), process.argv[3])

  console.log('Built, writing to ' + outputDir)

  if (fs.existsSync(outputDir)) {
    global.LOG(`Build directory already exists, removing`)
    fs.rmSync(outputDir, {recursive: true, force: true})
  }

  fs.mkdirSync(outputDir)
  global.LOG(`Created build directory`)

  def.writeFiles(outputDir)

  console.log('Done')
}

build()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
