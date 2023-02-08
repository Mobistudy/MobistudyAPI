import studyStatsCtrl from '../../src/controllers/studyStatsCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'
import { mockObject } from '../mocks/mocker.mjs'

// mock app logger
mockObject(applogger)
mockObject(DAL)

let SSCTRL

describe('Testing studies stats controller,', () => {

  beforeAll(async () => {
    SSCTRL = studyStatsCtrl
    DAL.getOneStudy = function () {
      return {
        _key: 'fake'
      }
    }

    DAL.getAllTeams = function () {
      return [{}]
    }

    DAL.getLastTasksSummary = function () {
      return [{
        userKey: '1122',
        name: 'Dario',
        surname: 'Salvi',
        DOB: '1994-06-04',
        status: 'accepted',
        lastTaskDate: null,
        lastTaskType: null
      }]
    }
  }, 1000)

  afterAll(async () => {

  })

  it('no study key no party', async () => {
    let res = new MockResponse()
    await SSCTRL.getLastTasksSummary({
      user: {
        role: 'researcher'
      },
      params: {
      }
    }, res)
    expect(res.code).toBe(400)
  })

  it('participants cannot access study stats', async () => {
    let res = new MockResponse()
    await SSCTRL.getLastTasksSummary({
      user: {
        role: 'participant'
      },
      params: {
        study_key: '1978'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('researchers can access their studies stats', async () => {
    let res = new MockResponse()
    await SSCTRL.getLastTasksSummary({
      user: {
        role: 'researcher'
      },
      params: {
        study_key: '1978'
      }
    }, res)

    expect(res.data).not.toBeNull()
    expect(res.data).not.toBeUndefined()
    expect(res.data.length).toBe(1)
    expect(res.data[0].userKey).toBe('1122')
  })
})
