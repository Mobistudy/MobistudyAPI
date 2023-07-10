import auditLogCtrl from '../../src/controllers/auditLogCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'

describe('Testing audit logs controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    // mock app logger
    spyOnAllFunctions(applogger)
  }, 100)

  it('participants cannot access audit logs', async () => {
    let res = new MockResponse()
    await auditLogCtrl.getAuditLogs({
      user: {
        role: 'participant'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('researchers can access their audit logs', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{}])
    spyOn(DAL, 'getAuditLogs').and.returnValue([{
      timestamp: "2019-02-27T12:46:07.294Z",
      event: "tasksResultsCreated",
      userKey: '1212',
      studyKey: "44555333",
      taskId: 1,
      message: "task results completed",
      refData: "taskResults",
      refKey: "12123132"
    }])

    let res = new MockResponse()
    await auditLogCtrl.getAuditLogs({
      user: {
        role: 'researcher'
      },
      query: {
        studyKey: 'fake'
      }
    }, res)

    expect(res.data).not.toBeNull()
    expect(res.data).not.toBeUndefined()
    expect(res.data.length).toBe(1)
    expect(res.data[0].userKey).toBe('1212')
  })
})
