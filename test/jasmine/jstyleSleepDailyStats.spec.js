import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import attachments from '../../src/services/attachments.mjs'
import PassThrough from 'stream'
import JStyleSleepStats from '../../src/taskResultsIndicators/jstyleSleepDailyStats.mjs'

function dateDiffInMinutes (a, b) {
  const _MS_PER_MINUTE = 1000 * 60;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate(), a.getHours(), a.getMinutes())
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate(), b.getHours(), b.getMinutes())
  return Math.floor((utc2 - utc1) / _MS_PER_MINUTE)
}

function createSleepQualityArray (length, quality) {
  let arr = []
  for (let i = 0; i < length; i++) {
    arr.push(quality)
  }
  return arr
}

describe("Testing jStyle Sleep Stats indicator,", () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    spyOnAllFunctions(applogger)
  }, 100)

  it('if no indicator exists, a new indicator is created for a single day', async () => {
    let studyKey = 'studyKey'
    let userKey = 'userKey'
    let taskIds = [1]

    spyOn(DAL, 'findUnprocessedTaskResults').and.returnValue([{ taskResultKey: 'trkey1' }])

    spyOn(DAL, 'getOneTaskResult').and.returnValue({
      _key: "trkey1",
      userKey,
      participantKey: "participant1",
      studyKey,
      taskId: 1,
      createdTS: "2025-08-28T13:13:42.529Z",
      taskType: "jstyle",
      phone: {
        manufacturer: "OnePlus",
        model: "ONEPLUS A5010",
        OSversion: "10",
        appVersion: "0.4.4",
        timeZone: "Europe/Stockholm"
      },
      summary: {
        startedTS: "2025-08-28T13:13:42.529Z",
        completedTS: "2025-08-28T13:13:46.056Z",
      },
      attachments: ["jstyledata.json"]
    })
    spyOn(DAL, 'getAllTaskIndicators').and.returnValues([])

    let createdIndicators = []
    spyOn(DAL, 'createTaskIndicator').and.callFake(async (indicator) => {
      createdIndicators.push(indicator)
      return indicator
    })

    let sleepData = {
      sleep: [{
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-28T00:41:01.000Z"
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-28T02:41:01.000Z"
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-28T04:55:01.000Z"
      }]
    }
    const mockedStream = new PassThrough()
    spyOn(attachments, 'getAttachmentReader').and.callFake(() => {
      setImmediate(() => {
        mockedStream.emit('data', JSON.stringify(sleepData))
        mockedStream.emit('end')
      })
      return mockedStream
    })


    await JStyleSleepStats.processJStyleSleepStats(studyKey, userKey, taskIds)

    expect(DAL.findUnprocessedTaskResults).toHaveBeenCalledTimes(1)
    expect(DAL.getOneTaskResult).toHaveBeenCalledTimes(1)
    expect(DAL.getAllTaskIndicators).toHaveBeenCalledTimes(1)
    expect(DAL.createTaskIndicator).toHaveBeenCalledTimes(1)
    expect(createdIndicators).toBeDefined()
    expect(createdIndicators.length).toBe(1)

    // "2025-08-27T22:00:00.000Z" corresponds to 2025-08-28 in Europe/Stockholm time zone
    expect(dateDiffInMinutes(createdIndicators[0].indicatorsDate, new Date("2025-08-27T22:00:00.000Z"))).toBe(0)
    expect(createdIndicators[0]).toEqual(jasmine.objectContaining({
      userKey,
      studyKey,
      taskIds,
      participantKey: "participant1",
      producer: 'jstyle-sleep-daily-stats',
      indicators: jasmine.objectContaining({
        sleepQualityRecords: 360,
        sleepDurationMins: 360
      })
    }))
    expect(createdIndicators[0].indicators.meanSleepQuality).toBeCloseTo(5.0)
    expect(createdIndicators[0].indicators.stdSleepQuality).toBeCloseTo(0)
  })


  it('if no indicator exists, mulitple indicators are created from data from multiple days', async () => {
    let studyKey = 'studyKey'
    let userKey = 'userKey'
    let taskIds = [1]

    spyOn(DAL, 'findUnprocessedTaskResults').and.returnValue([{ taskResultKey: 'trkey1' }])

    spyOn(DAL, 'getOneTaskResult').and.returnValue({
      _key: "trkey1",
      userKey,
      participantKey: "participant1",
      studyKey,
      taskId: 1,
      createdTS: "2025-08-28T13:13:42.529Z",
      taskType: "jstyle",
      phone: {
        manufacturer: "OnePlus",
        model: "ONEPLUS A5010",
        OSversion: "10",
        appVersion: "0.4.4",
        timeZone: "Europe/Stockholm"
      },
      summary: {
        startedTS: "2025-08-28T13:13:42.529Z",
        completedTS: "2025-08-28T13:13:46.056Z",
      },
      attachments: ["jstyledata.json"]
    })
    spyOn(DAL, 'getAllTaskIndicators').and.returnValues([], []) // no existing indicators when processing

    let createdIndicators = []
    spyOn(DAL, 'createTaskIndicator').and.callFake(async (indicator) => {
      createdIndicators.push(indicator)
      return indicator
    })

    let sleepData = {
      sleep: [{
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-28T00:41:01.000Z"
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-28T02:41:01.000Z"
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-28T04:55:01.000Z"
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-28T23:30:01.000Z" // this belongs to 29
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-29T01:40:01.000Z"
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-29T02:55:01.000Z"
      }, {
        sleepQualityDurationMins: 1,
        sleepQuality: createSleepQualityArray(120, 5),
        date: "2025-08-29T05:00:01.000Z"
      }]
    }
    const mockedStream = new PassThrough()
    spyOn(attachments, 'getAttachmentReader').and.callFake(() => {
      setImmediate(() => {
        mockedStream.emit('data', JSON.stringify(sleepData))
        mockedStream.emit('end')
      })
      return mockedStream
    })


    await JStyleSleepStats.processJStyleSleepStats(studyKey, userKey, taskIds)

    expect(DAL.findUnprocessedTaskResults).toHaveBeenCalledTimes(1)
    expect(DAL.getOneTaskResult).toHaveBeenCalledTimes(1)
    expect(DAL.getAllTaskIndicators).toHaveBeenCalledTimes(2)
    expect(DAL.createTaskIndicator).toHaveBeenCalledTimes(2)
    expect(createdIndicators).toBeDefined()
    expect(createdIndicators.length).toBe(2)

    // "2025-08-27T22:00:00.000Z" corresponds to 2025-08-28 in Europe/Stockholm time zone
    expect(dateDiffInMinutes(createdIndicators[0].indicatorsDate, new Date("2025-08-27T22:00:00.000Z"))).toBe(0)
    expect(createdIndicators[0]).toEqual(jasmine.objectContaining({
      userKey,
      studyKey,
      taskIds,
      participantKey: "participant1",
      producer: 'jstyle-sleep-daily-stats',
      indicators: jasmine.objectContaining({
        sleepQualityRecords: 360,
        sleepDurationMins: 360
      })
    }))
    expect(createdIndicators[0].indicators.meanSleepQuality).toBeCloseTo(5.0)
    expect(createdIndicators[0].indicators.stdSleepQuality).toBeCloseTo(0)

    expect(dateDiffInMinutes(createdIndicators[1].indicatorsDate, new Date("2025-08-28T22:00:00.000Z"))).toBe(0)
    expect(createdIndicators[1]).toEqual(jasmine.objectContaining({
      userKey,
      studyKey,
      taskIds,
      participantKey: "participant1",
      producer: 'jstyle-sleep-daily-stats',
      indicators: jasmine.objectContaining({
        sleepQualityRecords: 4 * 120,
        sleepDurationMins: 4 * 120
      })
    }))
    expect(createdIndicators[1].indicators.meanSleepQuality).toBeCloseTo(5.0)
    expect(createdIndicators[1].indicators.stdSleepQuality).toBeCloseTo(0)
  })

})
