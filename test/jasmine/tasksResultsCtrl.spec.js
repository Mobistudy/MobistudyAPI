import { open as fsOpen, stat as fsStat, rm as fsRmdir } from 'fs/promises'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import auditLogger from '../../src/services/auditLogger.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'
import { mockObject } from '../mocks/mocker.mjs'
import tasksResultsCtrl from '../../src/controllers/tasksResultsCtrl.mjs'


Date.prototype.toISODateString = function () {
  return this.toISOString().slice(0, 10)
}

describe('Testing tasks results controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    // mock dependencies
    mockObject(applogger)
    mockObject(auditLogger)
    mockObject(DAL)

    // mock schema validation
    // tasksResultsCtrl.validate = () => {return true}

    await tasksResultsCtrl.init()
  }, 100)

  afterEach(() => {
    DAL.resetMock()
  })

  describe("when a study exists with tasks results", () => {

    afterEach(() => {
      DAL.resetMock()
    })

    // let study1Key, researcher1Key, team1Key, user1Key, participant1Key;
    // beforeAll(async () => {
    //   // feed with some initial data
    //   researcher1Key = await addDataToCollection("users", {
    //     email: "reseacher1@uni1.edu",
    //     hashedPasswor: "xxxxxxxx",
    //     role: "researcher",
    //   })

    //   team1Key = await addDataToCollection("teams", {
    //     name: "team1",
    //     createdTS: "2018-11-12T16:40:07.542Z",
    //     researchersKeys: [researcher1Key],
    //     invitationCode: "xxxx",
    //     invitationExpiry: "2018-11-26T10:13:08.386Z",
    //   })

    //   study1Key = await addDataToCollection("studies", {
    //     createdTS: "2019-02-27T12:46:07.294Z",
    //     updatedTS: "2019-02-27T12:46:07.294Z",
    //     teamKey: team1Key,
    //     generalities: {
    //       title: {
    //         en: "study1"
    //       }
    //     },
    //     tasks: [
    //       {
    //         id: 1,
    //         type: 'form'
    //       }
    //     ]
    //   })

    //   user1Key = await addDataToCollection("users", {
    //     email: "participant1@company1.com",
    //     hashedPasswor: "xxxxxxxx",
    //     role: "participant",
    //   })

    //   participant1Key = await addDataToCollection("participants", {
    //     userKey: user1Key,
    //     studies: [
    //       {
    //         studyKey: study1Key,
    //         currentStatus: "accepted",
    //         acceptedTS: "2019-02-27T12:46:07.294Z",
    //         taskItemsConsent: [
    //           {
    //             taskId: 1,
    //             consented: true,
    //             lastExecuted: "2019-02-27T12:46:07.294Z"
    //           }
    //         ]
    //       }
    //     ]
    //   })
    // }, 5000)

    // afterAll(async () => {
    //   await removeFromCollection("users", researcher1Key)
    //   await removeFromCollection("teams", team1Key)
    //   await removeFromCollection("teams", participant1Key)
    //   await removeFromCollection("studies", study1Key)
    //   await fsRmdir('tasksuploads/' + study1Key + '/', { recursive: true })
    // })

    it("researchers cannot send results", async () => {
      let res = new MockResponse()
      tasksResultsCtrl.createNew({
        user: {
          role: 'researcher'
        },
        body: {
        }
      }, res)

      expect(res.code).toBe(403)
    })

    it("participant cannot send results for a study he is not in", async () => {
      DAL.nextReturnedValuesSequence = [
        // participant
        {
          userKey: 'userkey1',
          studies: [
            {
              studyKey: '123456',
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
        }
      ]
      let res = new MockResponse()
      await tasksResultsCtrl.createNew({
        user: {
          _key: 'userkey1',
          role: 'participant'
        },
        body: {
          studyKey: 'abc', // different study key
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        }
      }, res)

      expect(res.code).toBe(400)
      expect(res.data).toBe('Tasks results sent for a participant with no study with key abc')
    })

    it("participant cannot send results for a task he doesn't have", async () => {
      DAL.nextReturnedValuesSequence = [
        // participant
        {
          userKey: 'userkey1',
          studies: [
            {
              studyKey: '123456',
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
        }
      ]
      let res = new MockResponse()
      await tasksResultsCtrl.createNew({
        user: {
          _key: 'userkey1',
          role: 'participant'
        },
        body: {
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 100,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        }
      }, res)

      expect(res.code).toBe(400)
      expect(res.data).toBe('Tasks results sent for a participant with no task with id 100')
    })

    it("participant can send results without data", async () => {
      DAL.nextReturnedValuesSequence = [
        // participant
        {
          userKey: 'userkey1',
          studies: [
            {
              studyKey: '123456',
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
        },
        // transaction
        {},
        // task result
        {
          _key: 'testtr1',
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        },
        // replace participant
        true,
        //end transaction
        true
      ]
      let res = new MockResponse()
      await tasksResultsCtrl.createNew({
        user: {
          _key: 'userkey1',
          role: 'participant'
        },
        body: {
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        }
      }, res)

      expect(res.code).toBe(200)
      expect(DAL.calledFunctionsSequence[DAL.calledFunctionsSequence.length - 1]).toBe('endTransaction')
      expect(DAL.calledFunctionsSequence[DAL.calledFunctionsSequence.length - 2]).toBe('replaceParticipant')
      expect(DAL.calledFunctionsSequence[DAL.calledFunctionsSequence.length - 3]).toBe('createTasksResults')
      let args = DAL.calledFunctionsArgumentsSequence[DAL.calledFunctionsArgumentsSequence.length - 3]
      expect(args[0].studyKey).toBe('123456')
      expect(args[0].taskId).toBe(1)
    })

    it("participant can send results with data", async () => {
      DAL.nextReturnedValuesSequence = [
        // participant
        {
          userKey: 'userkey1',
          studies: [
            {
              studyKey: '123456',
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
        },
        // transaction1
        {},
        // transaction2
        {},
        // start transaction
        {},
        // create task result
        {
          _key: 'testtr1',
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        },
        // replacement
        {
          _key: 'testtr1',
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        },
        // replace participant
        true,
        //end transaction
        true
      ]
      let res = new MockResponse()
      await tasksResultsCtrl.createNew({
        user: {
          _key: 'userkey1',
          role: 'participant'
        },
        body: {
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          },
          data: [{
            timeStamp: '2022-02-02',
            questionId: 'q1'
          }]
        }
      }, res)

      expect(res.code).toBe(200)

      expect(DAL.calledFunctionsSequence[DAL.calledFunctionsSequence.length - 1]).toBe('endTransaction')
      expect(DAL.calledFunctionsSequence[DAL.calledFunctionsSequence.length - 2]).toBe('replaceParticipant')
      expect(DAL.calledFunctionsSequence[DAL.calledFunctionsSequence.length - 3]).toBe('replaceTasksResults')
      let args = DAL.calledFunctionsArgumentsSequence[DAL.calledFunctionsArgumentsSequence.length - 3]
      expect(args[1].studyKey).toBe('123456')
      expect(args[1].data).toBeUndefined()
      expect(args[1].attachments).toBeDefined()
      expect(args[1].attachments.length).toBe(1)

      let filePath = 'tasksuploads/123456/userkey1/1/testtr1.json'
      await fsStat(filePath)
      let file = await fsOpen(filePath)
      let fileContent = await file.readFile('utf-8')

      expect(fileContent).toBe('[{\"timeStamp\":\"2022-02-02\",\"questionId\":\"q1\"}]')
      file.close()

      await fsRmdir('tasksuploads/123456/', { recursive: true })
    })

    it("participant can get all own results", async () => {
      DAL.nextReturnedValuesSequence = [
        // get task result
        [{
          _key: 'testtr1',
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        }]
      ]
      let res = new MockResponse()
      await tasksResultsCtrl.getAll({
        user: {
          _key: 'userkey1',
          role: 'participant'
        }
      }, res)

      expect(res).toBeDefined()
      expect(res.code).toBe(200)
      expect(res.data.length).toBe(1)
      expect(res.data[0]._key).toBe('testtr1')
    })

    it("participant can get own results for a given study", async () => {
      DAL.nextReturnedValuesSequence = [
        // get task result
        [{
          _key: 'testtr1',
          studyKey: '123456',
          userKey: 'userkey1',
          taskId: 1,
          taskType: 'form',
          summary: {
            startedTS: "2022-02-02",
            completedTS: "2022-02-02",
            answered: 1,
            asked: 1
          }
        }]
      ]
      let res = new MockResponse()
      await tasksResultsCtrl.getAll({
        user: {
          _key: 'userkey1',
          role: 'participant'
        },
        query: {
          studyKey: '123456'
        }
      }, res)

      expect(res).toBeDefined()
      expect(res.code).toBe(200)
      expect(res.data.length).toBe(1)
      expect(res.data[0].studyKey).toBe('123456')
    })
  })
})
