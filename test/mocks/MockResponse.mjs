function MockResponse () {
  this.code = 0
  this.data = ''

  this.status = (s) => {
    this.code = s
    this.data = ''
    return new MockResponse()
  }

  this.send = (d) => {
    this.data = d
  }

  this.sendStatus = (s) => {
    this.data = ''
    this.code = s
  }
}

export { MockResponse }