import { type } from 'os'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { processJStyleDailyStats } from '../../src/taskResultsIndicators/jstyleDailyStats.mjs'

function dateDiffInMinutes (a, b) {
  const _MS_PER_MINUTE = 1000 * 60;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate(), a.getHours(), a.getMinutes());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate(), b.getHours(), b.getMinutes());
  return Math.floor((utc2 - utc1) / _MS_PER_MINUTE);
}

describe("Testing jStyle Daily Stats indicator,", () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    spyOnAllFunctions(applogger)
  }, 100)

  it('calling the processJStyleDailyStats function twice leads to one processing', async () => {
    let studyKey = 'studyKey'
    let userKey = 'userKey'
    let taskIds = [1]

    spyOn(DAL, 'findUnprocessedTaskResults').and.returnValue([])

    processJStyleDailyStats(studyKey, userKey, taskIds)
    await processJStyleDailyStats(studyKey, userKey, taskIds)

    expect(DAL.findUnprocessedTaskResults).toHaveBeenCalledTimes(1)
  })

  it('calling the processJStyleDailyStats function with different taskIds leads to separate processing', async () => {
    let studyKey = 'studyKey'
    let userKey = 'userKey'

    spyOn(DAL, 'findUnprocessedTaskResults').and.returnValue([])

    processJStyleDailyStats(studyKey, userKey, [1])
    await processJStyleDailyStats(studyKey, userKey, [2])

    expect(DAL.findUnprocessedTaskResults).toHaveBeenCalledTimes(2)
  })

  it('if no indicator exists a new indicator is created for each day', async () => {
    let studyKey = 'studyKey'
    let userKey = 'userKey'
    let taskIds = [1]

    spyOn(DAL, 'findUnprocessedTaskResults').and.returnValue(['trkey1'])

    spyOn(DAL, 'getOneTaskResult').and.returnValue({
      _key: "trkey1",
      userKey,
      participantKey: "participant1",
      studyKey,
      taskId: 1,
      type: "jstyle",
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
        activitySummary: [
          {
            recordCount: 0,
            steps: 4509,
            exerciseMinutes: 2092,
            distance: 2.7,
            calories: 145.4,
            goal: 45,
            activeMinutes: 5,
            date: "2025-08-27T22:00:00.000Z"
          },
          {
            recordCount: 1,
            steps: 3262,
            exerciseMinutes: 1486,
            distance: 1.95,
            calories: 104.74,
            goal: 32,
            activeMinutes: 3,
            date: "2025-08-26T22:00:00.000Z"
          },
        ]
      }
    })
    spyOn(DAL, 'getAllTaskIndicators').and.returnValues([], [])
    let createdIndicators = []
    spyOn(DAL, 'createTaskIndicator').and.callFake(async (indicator) => {
      createdIndicators.push(indicator)
      return indicator
    })

    await processJStyleDailyStats(studyKey, userKey, taskIds)

    expect(DAL.findUnprocessedTaskResults).toHaveBeenCalledTimes(1)
    expect(DAL.getOneTaskResult).toHaveBeenCalledTimes(1)
    expect(DAL.getAllTaskIndicators).toHaveBeenCalledTimes(2)
    expect(DAL.createTaskIndicator).toHaveBeenCalledTimes(2)
    expect(createdIndicators).toBeDefined()
    expect(createdIndicators.length).toBe(2)
    expect(dateDiffInMinutes(createdIndicators[0].indicatorsDate, new Date("2025-08-27T22:00:00.000Z"))).toBe(0)
    expect(dateDiffInMinutes(createdIndicators[1].indicatorsDate, new Date("2025-08-26T22:00:00.000Z"))).toBe(0)
    expect(createdIndicators[0]).toEqual(jasmine.objectContaining({
      userKey,
      studyKey,
      taskIds,
      participantKey: "participant1",
      producer: 'jstyle-daily-stats',
      indicators: jasmine.objectContaining({
        steps: 4509,
        exerciseMinutes: 2092,
        distance: 2.7,
        calories: 145.4,
        activeMinutes: 5,
      })
    }))

    expect(createdIndicators[1]).toEqual(jasmine.objectContaining({
      userKey,
      studyKey,
      taskIds,
      participantKey: "participant1",
      producer: 'jstyle-daily-stats',
      indicators: jasmine.objectContaining({
        steps: 3262,
        exerciseMinutes: 1486,
        distance: 1.95,
        calories: 104.74,
        activeMinutes: 3,
      })
    }))
  })


  it('if a past indicator exists it is updated', async () => {
    let studyKey = 'studyKey'
    let userKey = 'userKey'
    let participantKey = 'participant1'
    let taskIds = [1]

    spyOn(DAL, 'findUnprocessedTaskResults').and.returnValue(['trkey1'])

    spyOn(DAL, 'getOneTaskResult').and.returnValue({
      _key: "trkey1",
      userKey,
      participantKey,
      studyKey,
      taskId: 1,
      type: "jstyle",
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
        activitySummary: [
          {
            recordCount: 0,
            steps: 4509,
            exerciseMinutes: 2092,
            distance: 2.7,
            calories: 145.4,
            goal: 45,
            activeMinutes: 5,
            date: "2025-08-27T22:00:00.000Z"
          }
        ]
      }
    })
    spyOn(DAL, 'getAllTaskIndicators').and.returnValues([{
      _key: "existing1",
      userKey,
      studyKey,
      taskIds,
      participantKey,
      taskResultsKeys: ["oldtr1"],
      producer: 'jstyle-daily-stats',
      createdTS: new Date("2025-08-28T10:00:00.000Z"),
      indicatorsDate: new Date("2025-08-27T22:00:00.000Z"),
      indicators: {
        steps: 1000,
        exerciseMinutes: 3000,
        distance: 10,
        calories: 100,
        activeMinutes: 10
      }
    }])
    let updatedIndicators = []
    spyOn(DAL, 'updateTaskIndicator').and.callFake(async (key, indicator) => {
      updatedIndicators.push(indicator)
      return indicator
    })

    await processJStyleDailyStats(studyKey, userKey, taskIds)

    expect(DAL.findUnprocessedTaskResults).toHaveBeenCalledTimes(1)
    expect(DAL.getOneTaskResult).toHaveBeenCalledTimes(1)
    expect(DAL.getAllTaskIndicators).toHaveBeenCalledTimes(1)
    expect(DAL.updateTaskIndicator).toHaveBeenCalledTimes(1)
    expect(updatedIndicators.length).toBe(1)
    expect(dateDiffInMinutes(updatedIndicators[0].indicatorsDate, new Date("2025-08-27T22:00:00.000Z"))).toBe(0)
    expect(updatedIndicators[0]).toEqual(jasmine.objectContaining({
      userKey,
      studyKey,
      taskIds,
      participantKey: "participant1",
      producer: 'jstyle-daily-stats',
      indicators: jasmine.objectContaining({
        steps: 5509,
        exerciseMinutes: 5092,
        distance: 12.7,
        calories: 245.4,
        activeMinutes: 15,
      })
    }))
    expect(updatedIndicators[0].taskResultsKeys).toContain('trkey1')
  })

})
