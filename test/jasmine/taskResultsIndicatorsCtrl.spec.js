import taskResultsIndicatorsCtrl from '../../src/controllers/taskResultsIndicatorsCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import jstyleActivityDailyStats from "../../src/taskResultsIndicators/jstyleActivityDailyStats.mjs"
import { MockResponse } from '../mocks/MockResponse.mjs'

describe('Testing task results indicators controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    // mock app logger
    spyOnAllFunctions(applogger)
  }, 100)

  it('no study key no party', async () => {
    let res = new MockResponse()
    await taskResultsIndicatorsCtrl.getTaskResultsIndicators({
      user: {
        role: 'researcher'
      },
      params: {
      }
    }, res)
    expect(res.code).toBe(400)
  })

  it('participants cannot access task results indicators', async () => {
    spyOn(DAL, 'getStudyByKey').and.returnValue({
      _key: 'fake'
    })
    let res = new MockResponse()
    await taskResultsIndicatorsCtrl.getTaskResultsIndicators({
      user: {
        role: 'participant'
      },
      params: {
        studyKey: '1978'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('researchers can access their studies task results indicators', async () => {
    spyOn(DAL, 'getStudyByKey').and.returnValue({
      _key: 'fake'
    })
    spyOn(DAL, 'getAllTeams').and.returnValue([{}])
    spyOn(DAL, 'getAllTaskIndicators').and.returnValue([{
      _key: '1122',
      studyKey: '1978',
      userKey: '3344',
      taskIds: ['task1'],
      taskResultsKeys: ['5566'],
      producer: 'jstyle-activity-daily-stats',
      indicatorsDate: new Date('2024-06-20'),
      indicators: {
        steps: 1234,
        distance: 5678
      },
      createdTS: new Date()
    }, {
      _key: '1122',
      studyKey: '1978',
      userKey: '3344',
      taskIds: ['task1'],
      taskResultsKeys: ['6655'],
      producer: 'jstyle-activity-daily-stats',
      indicatorsDate: new Date('2024-06-21'),
      indicators: {
        steps: 2211,
        distance: 5566
      },
      createdTS: new Date()
    }])
    let res = new MockResponse()
    await taskResultsIndicatorsCtrl.getTaskResultsIndicators({
      user: {
        role: 'researcher',
        _key: '998877'
      },
      params: {
        studyKey: '1978',
        userKey: '3344'
      },
      query: {}
    }, res)

    expect(res.code).toBe(200)
    expect(res.data.length).toBe(2)
    expect(DAL.getAllTaskIndicators).toHaveBeenCalledWith('1978', '3344', undefined, null, null, undefined, undefined, null)
  })

  it('admin can get producers names', async () => {

    let res = new MockResponse()
    await taskResultsIndicatorsCtrl.getTaskResultsIndicatorsProducers({
      user: {
        role: 'researcher',
        _key: '998877'
      }
    }, res)

    expect(res.code).toBe(200)
    expect(res.data.length).toBe(2)
    expect(res.data).toContain('jstyle-activity-daily-stats')
    expect(res.data).toContain('jstyle-sleep-daily-stats')
  })

    it('non admin cannot run producers', async () => {
    let res = new MockResponse()
    await taskResultsIndicatorsCtrl.runTaskResultsIndicatorsProducer({
      user: {
        role: 'researcher',
        _key: '998877'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('admin can run producers', async () => {
    spyOn(DAL, 'getAllParticipants').and.returnValue([
      {
        _key: 'participant1'
      }
    ])
    spyOn(jstyleActivityDailyStats, 'processJStyleDailyStats').and.returnValue(null)

    let res = new MockResponse()
    await taskResultsIndicatorsCtrl.runTaskResultsIndicatorsProducer({
      user: {
        role: 'admin',
        _key: '998877'
      },
      params: {
        producer: 'jstyle-activity-daily-stats',
        studyKey: '1978',
        taskId: '1'
      },
    }, res)

    expect(res.code).toBe(200)
    expect(jstyleActivityDailyStats.processJStyleDailyStats).toHaveBeenCalledWith('1978', 'participant1', [1])
  })
})
