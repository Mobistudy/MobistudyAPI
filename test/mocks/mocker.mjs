function mockObject (obj) {
  obj.mocked = true
  obj.lastCalledFunction = null
  obj.lastCalledArguments = null

  obj.calledFunctionsSequence = []
  obj.calledFunctionsArgumentsSequence = []

  obj.nextReturnedValue = null
  obj.nextReturnedValuesSequence = null

  obj.resetMock = function () {
    obj.lastCalledFunction = null
    obj.lastCalledArguments = null
    obj.calledFunctionsSequence = []
    obj.calledFunctionsArgumentsSequence = []
    obj.nextReturnedValue = null
    obj.nextReturnedValuesSequence = null
  }
  obj.resetMock.mocked = true

  for (const property in obj) {
    if (typeof obj[property] == 'function' && !obj[property].mocked) {
      if (obj[property].constructor.name === "AsyncFunction") {
        obj[property] = async function () {
          obj.lastCalledFunction = property
          obj.lastCalledArguments = arguments
          obj.calledFunctionsSequence.push(property)
          obj.calledFunctionsArgumentsSequence.push(arguments)

          if (obj.nextReturnedValue) {
            return obj.nextReturnedValue
          }
          if (obj.nextReturnedValuesSequence && obj.nextReturnedValuesSequence.length > 0) {
            let val = obj.nextReturnedValuesSequence.shift()
            return val
          }
        }
        obj[property].mocked = true
      } else {
        obj[property] = function () {
          this.lastCalledFunction = property
          this.lastCalledArguments = arguments
          obj.calledFunctionsSequence.push(property)
          obj.calledFunctionsArgumentsSequence.push(arguments)

          if (this.nextReturnedValue) {
            return obj.nextReturnedValue
          }
          if (obj.nextReturnedValuesSequence && obj.nextReturnedValuesSequence.length > 0) {
            let val = obj.nextReturnedValuesSequence.shift()
            return val
          }
        }
        obj[property].mocked = true
      }
    }
  }
}

export { mockObject }
