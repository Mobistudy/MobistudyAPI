import stream from 'stream'

/**
 * Mocked response, implements the writeable stream as the real response object
 */
class MockResponse extends stream.Writable {

  // dummy writer, only appends data into a buffer
  _write (chunk, enc, next) {
    this.chunks.push(Buffer.from(chunk))
    next()
  }

  constructor() {
    super()
    this.code = 0
    this.data = ''
    this.chunks = []
  }

  status (s) {
    this.code = s
    this.data = ''
    return this
  }

  send (d) {
    this.data = d
  }

  json (d) {
    this.data = d
  }

  sendStatus (s) {
    this.data = ''
    this.code = s
  }

  readChunks () {
    return Buffer.concat(this.chunks).toString('utf8')
  }
}

export { MockResponse }
