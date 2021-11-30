const kill = require('tree-kill')
const { spawn } = require('child_process')


// home


class Client {
  uploadFile(filepath) {
    // read file path and upload it with axios
    // return filename or command needed to run
  }

  uploadGcode(script) {
    // hash script
    // return filename or command needed to run
  }

  run() {
    // run script for the thing
  }
}

class Dosimeter {
  constructor() {
    this.data = ''
  }

  start() {
    // ffmpeg -f avfoundation -nostats -i ":1" -filter_complex ebur128 -f null -
    // process.kill(sh.pid, 'SIGINT');
    this.process = spawn( 'ffmpeg ',
      ['-f', 'avfoundation', '-nostats', '-i', ':1', '-filter_complex',
        'ebur128', '-f', 'null', '-', '2>&1'],
      {shell: true})
    this.process.stdout.on('data', this.onData.bind(this))
    // this.process.stderr.on('data', this.onError.bind(this))
    this.process.on('close', this.onClose.bind(this))
  }

  stop() {
    console.log('stop called')
    // this.process.kill doesn't work for child processes started in a shell
    kill(this.process.pid)
  }

  save() {
  }

  onData(data) {
    this.data += data
  }

  onClose() {
    console.log('closed')
  }

  parse() {
    const lines = this.data.split('\n')

    // expected format:
    //
    // ... stuff ...
    //
    // [Parsed_ebur128_0 @ 0x144823c20] Summary:
    //
    // ...
    //
    // [Parsed_ebur128_0 @ 0x144855310] t: 0.0999792  TARGET:-23 LUFS    M:-120.7 S:-120.7     I: -70.0 LUFS       LRA:   0.0 LU
    // [Parsed_ebur128_0 @ 0x144855310] t: 0.221312   TARGET:-23 LUFS    M:-120.7 S:-120.7     I: -70.0 LUFS       LRA:   0.0 LU
    //
    // ...
    //
    // [Parsed_ebur128_0 @ 0x144855310] Summary:
    // 
    //   Integrated loudness:
    //     I:         -47.1 LUFS
    //     Threshold: -57.1 LUFS
    // 
    //   Loudness range:
    //     LRA:         0.6 LU
    //     Threshold: -67.2 LUFS
    //     LRA low:   -47.4 LUFS
    //     LRA high:  -46.8 LUFS
    // Exiting normally, received signal 2.


    let i = 0

    // skip everything before the first data line
    while (!/^\[Parsed_ebur128_0.*] t:.*/.test(lines[i])) {
      i++
    }

    const matcher = new RegExp(
      't: <value> TARGET: <value> LUFS M: <value> S: <value> I: <value> LUFS LRA: <value> LU'
      .replace(/\s+/g, '\\s*')
      .replace(/<value>/g, '([.\\d-]+)')

    )

    this.raw = []
    while (/^\[Parsed_ebur128_0.*] t:.*/.test(lines[i])) {
      const match = lines[i].match(matcher)

      this.raw.push({
        t: match[1],
        target: match[2],
        m: match[3],
        s: match[4],
        i: match[5],
        lra: match[6],
      })

      //raw.push(lines[i])
      i++
    }

    // skip until summary
    while (!/^\[Parsed_ebur128_0.*] Summary/.test(lines[i])) {
      i++
    }

    //const summary = lines.slice(i, -2)
    const matcher2 = new RegExp(
      'Summary: Integrated loudness: I: <value> LUFS Threshold: <value> LUFS Loudness range: LRA: <value> LU Threshold: <value> LUFS LRA low: <value> LUFS LRA high: <value> LUFS'
      .replace(/\s+/g, '\\s*')
      .replace(/<value>/g, '([.\\d-]+)')
    )
    const match = lines.slice(i, -2).join('').match(matcher2)
    this.summary = {
      integratedLoudness: {
        i: match[1],
        threshold: match[2],
      },
      loudnessRange: {
        lra: match[3],
        threshold: match[4],
        lraLow: match[5],
        lraHigh: match[6],
      }
    }
  }
}

class Runner {

  run() {
    // TODO(ibash)
    // 1. connect client
    // 2. Run home once
    // 3. Run before each, run test, repeat...
  }

  next() {
    // TODO(ibash)
    // 1. Run before each
    // 2. Run test
    // 3. Save results
  }
}

module.exports = {
  Client,
  Dosimeter,
  Runner,
}
