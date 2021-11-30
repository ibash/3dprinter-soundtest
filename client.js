const axios = require('axios')

module.exports = class Client {
  constructor() {
    this.client = axios.create({
      baseURL: 'http://10.0.0.119'
    })
  }

  async uploadFile(name, script) {
    const filename = `0:/gcodes/${name}`
    const response = await this.client.put(`/machine/file/${encodeURIComponent(filename)}`, script, {
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    })

    // file location is in response.headers.location

    return response
  }

  async startFile(location) {
    if (!location) {
      throw new Error('location is required')
    }

    console.log(`running file ${location}`)

    return this.sendCode(`M32 "${location}"`)
  }

  // macros wait for completion
  async runMacro(location) {
    if (!location) {
      throw new Error('location is required')
    }

    console.log(`running macro ${location}`)

    return this.sendCode(`M98 P"${location}"`)
  }

  async sendCode(code) {
    // run script for the thing
    const response = await this.client.post('/machine/code', code, {
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    })

    // response.data has the text result
    return response
  }
}
