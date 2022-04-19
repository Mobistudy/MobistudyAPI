import {
  DB,
  connectToDatabase,
  dropDatabase,
  addDataToCollection,
  removeFromCollection,
  getFromCollection
} from "../arangoTools"
import { DAO } from '../../src/DAO/DAO'
import TRC from '../../src/controllers/tasksResults'

jest.mock('../../src/services/logger', () => ({
  applogger: {
    debug: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    error: jest.fn()
  }
}))

Date.prototype.toISODateString = function () {
  return this.toISOString().slice(0, 10);
};

const mockRes = {
  code: 0,
  data: '',
  status (s) {
    this.code = s
    this.data = ''
    return mockRes
  },
  send (d) {
    this.data = d
  },
  sendStatus (s) {
    this.data = ''
    this.code = s
  }
}

describe("When arangodb is running", () => {
  const DBNAME = "test_tasksResults";

  beforeAll(async () => {
    await connectToDatabase(DBNAME)
    DAO.db = DB
    await DAO.initAfterConnection()
  }, 60000);

  afterAll(async () => {
    await dropDatabase(DBNAME);
  });

  describe("when a study exists with finger tapping task", () => {
    let study1Key, researcher1Key, team1Key, user1Key, participant1Key;
    beforeAll(async () => {
      // feed with some initial data
      researcher1Key = await addDataToCollection("users", {
        email: "reseacher1@uni1.edu",
        hashedPasswor: "xxxxxxxx",
        role: "researcher",
      })

      team1Key = await addDataToCollection("teams", {
        name: "team1",
        createdTS: "2018-11-12T16:40:07.542Z",
        researchersKeys: [researcher1Key],
        invitationCode: "xxxx",
        invitationExpiry: "2018-11-26T10:13:08.386Z",
      })

      study1Key = await addDataToCollection("studies", {
        createdTS: "2019-02-27T12:46:07.294Z",
        updatedTS: "2019-02-27T12:46:07.294Z",
        teamKey: team1Key,
        generalities: {
          title: {
            en: "study1"
          }
        },
        tasks: [
          {
            id: 1,
            type: 'fingerTapping',
            scheduling: {
              alwaysOn: true,
              startEvent: 'consent',
              untilSecs: 60 * 60 * 24 * 7 // 1 week
            }
          }
        ]
      })

      user1Key = await addDataToCollection("users", {
        email: "participant1@company1.com",
        hashedPasswor: "xxxxxxxx",
        role: "participant",
      })

      participant1Key = await addDataToCollection("participants", {
        userKey: user1Key,
        studies: [
          {
            studyKey: study1Key,
            currentStatus: "accepted",
            acceptedTS: "2019-02-27T12:46:07.294Z",
            taskItemsConsent: [
              {
                taskId: 1,
                consented: true,
                lastExecuted: "2019-02-27T12:46:07.294Z"
              }
            ]
          }
        ]
      })
    }, 5000)

    test("researchers cannot send results", async () => {
      TRC.createNew({
        user: {
          role: 'researcher'
        },
        body: {
        }
      }, mockRes)

      expect(mockRes.code).toBe(403)
    })

    test("participant cannot send results for a study he is not in", async () => {
      await TRC.createNew({
        user: {
          _key: user1Key,
          role: 'participant'
        },
        body: {
          studyKey: 'abc'
        }
      }, mockRes)

      expect(mockRes.code).toBe(400)
      expect(mockRes.data).toBe('No study with key abc')
    })

    test("participant cannot send results for a task he doesn't have", async () => {
      await TRC.createNew({
        user: {
          _key: user1Key,
          role: 'participant'
        },
        body: {
          studyKey: study1Key,
          taskId: 100
        }
      }, mockRes)

      expect(mockRes.code).toBe(400)
      expect(mockRes.data).toBe('No task with id 100')
    })

    test("participant can send results", async () => {
      await TRC.createNew({
        user: {
          _key: user1Key,
          role: 'participant'
        },
        body: {
          studyKey: study1Key,
          taskId: 1,
          startedTS: new Date().toISOString()
        }
      }, mockRes)

      expect(mockRes.code).toBe(200)

      let tr = await getFromCollection('tasksResults', mockRes.data._key)
      expect(tr).toBeDefined()
      expect(tr.studyKey).toBe(study1Key)
      expect(tr.taskId).toBe(1)

      await removeFromCollection("tasksResults", mockRes.data._key)
    })

    test("participant can get own results", async () => {
      let res1, res2, res3
      res1 = await addDataToCollection("tasksResults", {
        userKey: user1Key,
        studies: [
          {
            studyKey: study1Key,
            currentStatus: "accepted",
            acceptedTS: "2019-02-27T12:46:07.294Z",
            taskItemsConsent: [
              {
                taskId: 1,
                consented: true,
                lastExecuted: "2019-02-27T12:46:07.294Z"
              }
            ]
          }
        ]
      })
      res2 = await addDataToCollection("tasksResults", {
        userKey: user1Key,
        studies: [
          {
            studyKey: study1Key,
            currentStatus: "accepted",
            acceptedTS: "2019-02-27T12:46:07.294Z",
            taskItemsConsent: [
              {
                taskId: 1,
                consented: true,
                lastExecuted: "2019-02-27T12:46:07.294Z"
              }
            ]
          }
        ]
      })
      res3 = await addDataToCollection("tasksResults", {
        userKey: user1Key,
        studies: [
          {
            studyKey: study1Key,
            currentStatus: "accepted",
            acceptedTS: "2019-02-27T12:46:07.294Z",
            taskItemsConsent: [
              {
                taskId: 1,
                consented: true,
                lastExecuted: "2019-02-27T12:46:07.294Z"
              }
            ]
          }
        ]
      })

      await TRC.getAll({
        user: {
          _key: user1Key,
          role: 'participant'
        },
        body: {
          studyKey: study1Key,
          taskId: 1,
          startedTS: new Date().toISOString()
        }
      }, mockRes)

      expect(mockRes).toBeDefined()
      expect(mockRes.code).toBe(200)
      expect(mockRes.data.length).toBe(3)
    })


    afterAll(async () => {
      await removeFromCollection("users", researcher1Key)
      await removeFromCollection("teams", team1Key)
      await removeFromCollection("teams", participant1Key)
      await removeFromCollection("studies", study1Key)
    })
  })
})
