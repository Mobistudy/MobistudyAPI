import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as auditlogs from '../../src/DAL/auditLogDAL.mjs'
import * as users from '../../src/DAL/usersDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

// Storage module used for testing
let testDAL = {}

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf())
  date.setDate(date.getDate() + days)
  return date
};

Date.prototype.toISODateString = function () {
  return this.toISOString().slice(0, 10)
}

describe("Testing audit logs DAL,", () => {
  const DBNAME = "test_auditLogDAL";

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await users.init(db)
    await auditlogs.init(db)
    Object.assign(testDAL, auditlogs.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("When adding users,", () => {
    let uk1
    beforeAll(async () => {
      uk1 = await addDataToCollection('users', {
        email: 'dario.salvi@test.test'
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('users', uk1)
    })

    describe("When adding audit logs,", () => {
      let al_key

      beforeAll(async () => {
        al_key = await addDataToCollection('auditlogs', {
          timestamp: "2019-02-27T12:46:07.294Z",
          event: "tasksResultsCreated",
          userKey: uk1,
          studyKey: "44555333",
          taskId: 1,
          message: "task results completed",
          refData: "taskResults",
          refKey: "12123132"
        })
      }, 1000)

      afterAll(async () => {
        await removeFromCollection('auditlogs', al_key)
      })

      it('the log can be retrieved', async () => {
        let auditlogs = await testDAL.getAuditLogs()

        expect(auditlogs).not.toBeNull()
        expect(auditlogs).toBeDefined()
        expect(auditlogs.length).toBe(1)
        expect(auditlogs[0].event).toBe("tasksResultsCreated")
        expect(auditlogs[0].userEmail).toBe("dario.salvi@test.test")
      })

      it('the log can be filtered by email', async () => {
        let auditlogs = await testDAL.getAuditLogs(null, null, null, null, null, null, "dario.salvi@test.test")

        expect(auditlogs).not.toBeNull()
        expect(auditlogs).toBeDefined()
        expect(auditlogs.length).toBe(1)
        expect(auditlogs[0].event).toBe("tasksResultsCreated")
        expect(auditlogs[0].userEmail).toBe("dario.salvi@test.test")
      })

      it('if paged, results have a total cont abd a subset', async () => {
        let auditlogs = await testDAL.getAuditLogs(null, null, null, null, null, null, null, 0, 1)

        expect(auditlogs).not.toBeNull()
        expect(auditlogs).toBeDefined()
        expect(auditlogs.totalCount).toBe(1)
        expect(auditlogs.subset.length).toBe(1)
      })

    })

  })
})
