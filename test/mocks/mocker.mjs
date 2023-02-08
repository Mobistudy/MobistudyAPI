function mockObject (obj) {
  obj.mocked = true
  obj.lastCalledFunction = null
  obj.lastCalledArguments = null
  obj.nextReturnedValue = null
  obj.nextReturnedValuesSequence = null

  obj.resetMock = function () {
    obj.lastCalledFunction = null
    obj.lastCalledArguments = null
    obj.nextReturnedValue = null
    obj.nextReturnedValuesSequence = null
  }

  for (const property in obj) {
    if (typeof obj[property] == 'function' && property !== 'resetMock') {
      if (obj[property].constructor.name === "AsyncFunction") {
        obj[property] = async function () {
          obj.lastCalledFunction = property
          obj.lastCalledArguments = arguments

          if (obj.nextReturnedValue) {
            return obj.nextReturnedValue
          }
          if (obj.nextReturnedValuesSequence && obj.nextReturnedValuesSequence.length > 0) {
            let val = obj.nextReturnedValuesSequence.shift()
            return val
          }
        }
      } else {
        obj[property] = function () {
          this.lastCalledFunction = property
          this.lastCalledArguments = arguments

          if (this.nextReturnedValue) {
            return obj.nextReturnedValue
          }
          if (obj.nextReturnedValuesSequence && obj.nextReturnedValuesSequence.length > 0) {
            let val = obj.nextReturnedValuesSequence.shift()
            return val
          }
        }
      }
    }
  }
}

export { mockObject }
