const Client = require('./client.js')
const Dosimeter = require('./dosimeter.js')
const csv = require('fast-csv')
const fs = require('fs')
const glob = require('glob')
const path = require('path')

module.exports = class Runner {
  constructor() {
    this.client = new Client()
    this.dosimeter = new Dosimeter()
    this.files = {
      beforeAll: null,
      beforeEach: null,
      tests: []
    }

    // speeds in mm/min
    this.speeds = [1200, 1800]
  }

  async run() {
    await this.upload()

    await this.client.runMacro(this.files.beforeAll)


    for (const speed of this.speeds) {
      console.log(`Testing speed: ${speed}`)

      for (const location of this.files.tests) {
        await this.client.runMacro(this.files.beforeEach)

        await this.client.sendCode(`G1 F${speed}`)

        this.dosimeter.start()
        await this.client.runMacro(location)

        await this.dosimeter.stop()
        this.dosimeter.parse()


        const name = path.basename(location, '.gcode')
        fs.writeFileSync(`./output/${speed}-${name}.json`, JSON.stringify({
          name: name,
          speed: speed,
          raw: this.dosimeter.raw,
          summary: this.dosimeter.summary,
        }))
      }
    }

    await this.exportCsvs()
  }

  async upload() {
    const files = glob.sync('gcodes/*.gcode')
    for (const file of files) {
      const filename = path.basename(file, '.gcode')
      const content = fs.readFileSync(file, 'utf8')
      const response = await this.client.uploadFile(`soundtest/${filename}`, content)
      const location = response.headers.location
      if (filename === 'before-all') {
        this.files.beforeAll = location
      } else if (filename === 'before-each') {
        this.files.beforeEach = location
      } else {
        this.files.tests.push(location)
      }
    }
  }

  exportCsvs() {
    const files = glob.sync('output/*.json')

    const rawIn = csv.format()
    const rawOut = fs.createWriteStream(path.resolve(__dirname, 'output', 'raw.csv'))
    rawIn.pipe(rawOut)
    rawIn.write(['name', 'speed', 't', 'target', 'm', 's', 'i', 'lra'])

    const summaryIn = csv.format()
    const summaryOut = fs.createWriteStream(path.resolve(__dirname, 'output', 'summary.csv'))
    summaryIn.pipe(summaryOut)
    summaryIn.write(['name', 'speed', 'integratedLoudness.i', 'integratedLoudness.threshold', 'loudnessRange.lra', 'loudnessRange.threshold', 'loudnessRange.lraLow', 'loudnessRange.lraHigh'])

    for (const file of files) {
      const content = require(path.resolve('.', file))
      for (const raw of content.raw) {
        rawIn.write([content.name, content.speed, raw.t, raw.target, raw.m, raw.s, raw.i, raw.lra])
      }

      summaryIn.write([
        content.name, content.speed,
        content.summary.integratedLoudness.i,
        content.summary.integratedLoudness.threshold,
        content.summary.loudnessRange.lra,
        content.summary.loudnessRange.threshold,
        content.summary.loudnessRange.lraLow,
        content.summary.loudnessRange.lraHigh
      ])
    }

    rawIn.end()
    summaryIn.end()

    return Promise.all([
      new Promise((resolve) => rawOut.on('finish', resolve)),
      new Promise((resolve) => summaryOut.on('finish', resolve))
    ])
  }
}
