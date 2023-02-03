function mockObject (obj) {
  obj.mocked = true
  obj.lastCalledFunction = null
  obj.lastCalledArguments = null
  obj.resetCalls = function () {
    this.lastCalledFunction = null
    this.lastCalledArguments = null
  }
  for (const property in obj) {
    if (typeof obj[property] == 'function') {
      obj[property] = function () {
        this.lastCalledFunction = property
        this.lastCalledArguments = arguments
      }
    }
  }
}

export { mockObject }
