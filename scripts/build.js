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
  const configPath = path.resolve(process.cwd(), process.argv[2])
  const baseDir = path.dirname(configPath)
  console.log(`Loading config from: "${configPath}"`)
  const config = require(configPath)
  verbose = !!config.debug

  global.LOG(`Using config: `, config)

  /** @typedef CompiledAmplifyORMConfig */
  const formattedConfig = {
    srcSchema: path.resolve(baseDir, config.srcSchema),
    buildSchema: path.resolve(baseDir, config.buildSchema),
    fragments: (typeof config.fragments === 'string'
      ? require(path.resolve(baseDir, config.fragments))
      : config.fragments || {}),
    hooks: config.hooks && typeof config.hooks === 'string' ? path.resolve(baseDir, config.hooks) : null,
    useESM: config.useESM || false,
    collections: config.collections || null,
  }

  const def = OutputDefinition.buildFromAmplifyORMConfig(formattedConfig)

  if (formattedConfig.hooks) {
    def.setHooksPaths(path.resolve(baseDir, formattedConfig.hooks))
  }

  def.setUseEMS(formattedConfig.useESM)

  global.LOG(`Built OutputDefinition:`, def)

  const outputDir = path.resolve(process.cwd(), process.argv[3])

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
