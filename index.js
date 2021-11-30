const Runner = require('./runner.js')

const runner = new Runner()

;(async () => {
  await runner.run()
})()
