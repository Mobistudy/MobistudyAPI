import {
  ARANGOPORT,
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import setupStudiesStats from '../../src/DAO/studiesStats.mjs'
import setupParticipants from '../../src/DAO/participantsDAO.mjs'
import setupTasksResults from '../../src/DAO/tasksResultsDAO.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { fakeLogger } from '../mocks/logger.mjs'

// mock app logger
Object.assign(applogger, fakeLogger)

let SSDAO

describe('Testing studies stats, when arangodb is running,', () => {

  const DBNAME = 'test_studiestats'

  beforeAll(async () => {
    let db = await connectToDatabase(DBNAME)
    await setupParticipants(db)
    await setupTasksResults(db)
    SSDAO = await setupStudiesStats(db)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("when adding one participant and no results", () => {
    let part_key, taskr_key

    beforeAll(async () => {
      part_key = await addDataToCollection('participants', {
        userKey: '1234',
        name: 'Dario',
        surname: 'Salvi',
        dateOfBirth: '1976-03-14',
        studies: [
          {
            studyKey: 'abc',
            currentStatus: 'accepted',
            acceptedTS: "2019-02-27T12:46:07.294Z",
            taskItemsConsent: [
              {
                taskId: 1,
                consented: false
              }
            ]
          }
        ]
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('participants', part_key)
    })

    it('the wrong study gives no results', async () => {
      let summary = await SSDAO.getLastTasksSummary('12345')

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(0)
    })

    it('The LastTasksSummary statistics do not include last task date and type', async () => {
      let summary = await SSDAO.getLastTasksSummary('abc')

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(1)
      expect(summary[0].userKey).toBe('1234')
      expect(summary[0].lastTaskDate).toBeNull()
      expect(summary[0].lastTaskType).toBeNull()
    })
  })

  describe("when adding some participants and some results,", () => {
    let part1_key, part2_key, taskr1_1_key, taskr1_2_key, taskr2_1_key, taskr2_2_key

    beforeAll(async () => {
      part1_key = await addDataToCollection('participants', {
        userKey: '1234',
        name: 'Dario',
        surname: 'Salvi',
        dateOfBirth: '1976-03-14',
        studies: [
          {
            studyKey: 'abc',
            currentStatus: 'accepted',
            acceptedTS: "2023-02-05T12:46:07.294Z",
            taskItemsConsent: [
              {
                taskId: 1,
                consented: false
              }
            ]
          }
        ]
      })
      taskr1_1_key = await addDataToCollection('tasksResults', {
        userKey: '1234',
        studyKey: 'abc',
        createdTS: '2023-02-05T13:55:03',
        taskType: 'form'
      })
      taskr1_2_key = await addDataToCollection('tasksResults', {
        userKey: '1234',
        studyKey: 'abc',
        createdTS: '2023-02-05T14:02:00',
        taskType: 'tugt'
      })

      part2_key = await addDataToCollection('participants', {
        userKey: '6789',
        name: 'Gent',
        surname: 'Ymeri',
        dateOfBirth: '1992-01-12',
        studies: [
          {
            studyKey: 'abc',
            currentStatus: 'accepted',
            acceptedTS: "2023-02-27T12:46:07.294Z",
            taskItemsConsent: [
              {
                taskId: 1,
                consented: false
              }
            ]
          }
        ]
      })
      taskr2_1_key = await addDataToCollection('tasksResults', {
        userKey: '6789',
        studyKey: 'abc',
        createdTS: '2023-02-27T10:30:30',
        taskType: 'form'
      })
      taskr2_2_key = await addDataToCollection('tasksResults', {
        userKey: '6789',
        studyKey: 'abc',
        createdTS: '2023-02-28T11:20:20',
        taskType: '6mwt'
      })
    }, 1000)


    afterAll(async () => {
      await removeFromCollection('participants', part1_key)
      await removeFromCollection('participants', part2_key)
      await removeFromCollection('tasksResults', taskr1_1_key)
      await removeFromCollection('tasksResults', taskr1_2_key)
      await removeFromCollection('tasksResults', taskr2_1_key)
      await removeFromCollection('tasksResults', taskr2_2_key)
    })

    it('the LastTasksSummary statistics are retrieved correctly', async () => {
      let summary = await SSDAO.getLastTasksSummary('abc')

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(2)
      expect(summary[0].userKey).toBe('1234')
      expect(summary[0].lastTaskDate).toBe('2023-02-05T14:02:00')
      expect(summary[0].lastTaskType).toBe('tugt')
      expect(summary[1].userKey).toBe('6789')
      expect(summary[1].lastTaskDate).toBe('2023-02-28T11:20:20')
      expect(summary[1].lastTaskType).toBe('6mwt')
    })
  })

})
