import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection,
  updateDataInCollection
} from '../arangoTools.mjs'
import * as participants from '../../src/DAL/participantsDAL.mjs'
import * as tasksResults from '../../src/DAL/tasksResultsDAL.mjs'
import * as studystats from '../../src/DAL/studiesStatsDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

// Storage module used for testing
let testDAL = {}

describe('Testing studies stats DA integrated in Arango,', () => {

  const DBNAME = 'test_studiestats'

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await participants.init(db)
    Object.assign(testDAL, participants.DAL)
    await tasksResults.init(db)
    Object.assign(testDAL, tasksResults.DAL)
    await studystats.init(db)
    Object.assign(testDAL, studystats.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("when adding one participant and no results", () => {
    let user_key, part_key, taskr_key

    beforeAll(async () => {
      user_key = await addDataToCollection('users', {
        email: 'dario@test.test',
        role: 'participant'
      })
      part_key = await addDataToCollection('participants', {
        userKey: user_key,
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
      let summary = await testDAL.getLastTasksSummary('12345')

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(0)
    })

    it('The LastTasksSummary statistics do not include last task date and type', async () => {
      let summary = await testDAL.getLastTasksSummary('abc')

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(1)
      expect(summary[0].userKey).toBe(user_key)
      expect(summary[0].lastTaskDate).toBeNull()
      expect(summary[0].lastTaskType).toBeNull()
    })
  })

  describe("when adding some participants and some results,", () => {
    let study1Key, team1Key, user1_key, user2_key, part1_key, part2_key, taskr1_1_key, taskr1_2_key, taskr2_1_key, taskr2_2_key

    beforeAll(async () => {
      team1Key = await addDataToCollection('teams', {
        name: 'team1'
      })
      study1Key = await addDataToCollection('studies', {
        teamKey: team1Key
      })
      user1_key = await addDataToCollection('users', {
        email: 'dario@test.test',
        role: 'participant'
      })
      part1_key = await addDataToCollection('participants', {
        userKey: user1_key,
        name: 'Dario',
        surname: 'Salvi',
        dateOfBirth: '1976-03-14',
        studies: [
          {
            studyKey: study1Key,
            currentStatus: 'completed',
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
        userKey: user1_key,
        studyKey: study1Key,
        createdTS: '2023-02-05T13:55:03',
        taskType: 'form'
      })
      taskr1_2_key = await addDataToCollection('tasksResults', {
        userKey: user1_key,
        studyKey: study1Key,
        createdTS: '2023-02-05T14:02:00',
        taskType: 'tugt'
      })

      user2_key = await addDataToCollection('users', {
        email: 'gent@test.test',
        role: 'participant'
      })

      part2_key = await addDataToCollection('participants', {
        userKey: user2_key,
        name: 'Gent',
        surname: 'Ymeri',
        dateOfBirth: '1992-01-12',
        studies: [
          {
            studyKey: study1Key,
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
        userKey: user2_key,
        studyKey: study1Key,
        createdTS: '2023-02-27T10:30:30',
        taskType: 'form'
      })
      taskr2_2_key = await addDataToCollection('tasksResults', {
        userKey: user2_key,
        studyKey: study1Key,
        createdTS: '2023-02-28T11:20:20',
        taskType: '6mwt'
      })
    }, 1000)


    afterAll(async () => {
      await removeFromCollection('studies', study1Key)
      await removeFromCollection('teams', team1Key)
      await removeFromCollection('participants', part1_key)
      await removeFromCollection('participants', part2_key)
      await removeFromCollection('tasksResults', taskr1_1_key)
      await removeFromCollection('tasksResults', taskr1_2_key)
      await removeFromCollection('tasksResults', taskr2_1_key)
      await removeFromCollection('tasksResults', taskr2_2_key)
    })

    it('the LastTasksSummary statistics are retrieved correctly', async () => {
      let summary = await testDAL.getLastTasksSummary(study1Key)

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(2)
      expect(summary[0].userKey).toBe(user1_key)
      expect(summary[0].lastTaskDate).toBe('2023-02-05T14:02:00')
      expect(summary[0].lastTaskType).toBe('tugt')
      expect(summary[1].userKey).toBe(user2_key)
      expect(summary[1].lastTaskDate).toBe('2023-02-28T11:20:20')
      expect(summary[1].lastTaskType).toBe('6mwt')
    })

    it('the LastTasksSummary statistics can be filtered by name', async () => {
      let summary = await testDAL.getLastTasksSummary(study1Key, 'dar')

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(1) // only one participant has that name
      expect(summary[0].userKey).toBe(user1_key)
      expect(summary[0].lastTaskDate).toBe('2023-02-05T14:02:00')
      expect(summary[0].lastTaskType).toBe('tugt')
    })

    it('the LastTasksSummary statistics can be filtered by status type', async () => {
      let summary = await testDAL.getLastTasksSummary(study1Key, null, 'completed')

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.length).toBe(1) // only one participant is completed
      expect(summary[0].userKey).toBe(user1_key)
      expect(summary[0].lastTaskDate).toBe('2023-02-05T14:02:00')
      expect(summary[0].lastTaskType).toBe('tugt')
    })

    it('the LastTasksSummary statistics can be paged', async () => {
      let summary = await testDAL.getLastTasksSummary(study1Key, null, null, null, 0, 1)

      expect(summary).not.toBeNull()
      expect(summary).toBeDefined()
      expect(summary.totalCount).toBeDefined()
      expect(summary.totalCount).toBe(2)
      expect(summary.subset).toBeDefined()
      expect(summary.subset.length).toBe(1)
      expect(summary.subset[0].userKey).toBe(user1_key)
      expect(summary.subset[0].lastTaskDate).toBe('2023-02-05T14:02:00')
      expect(summary.subset[0].lastTaskType).toBe('tugt')
    })

    describe("when adding preferred participants,", () => {

      let userR1key;
      beforeAll(async () => {
        userR1key = await addDataToCollection('users', {
          email: 'john@mau.test',
          role: 'researcher'
        })
        await updateDataInCollection('teams', {
          name: 'team1',
          researchers: [
            {
              userKey: userR1key,
              studiesOptions: [
                {
                  studyKey: study1Key,
                  preferredParticipantsKeys: [
                    user1_key
                  ]
                }
              ]
            }
          ],
        }, team1Key)
      }, 1000)

      afterAll(async () => {
        await removeFromCollection('users', userR1key)
      })

      it('last task summary can include preferred participants', async () => {
        let preferred = {
          include: 'both',
          researcherKey: userR1key
        }
        // studyKey, participantName, statusType, preferredParticipants, offset, count, dataCallback
        let summary = await testDAL.getLastTasksSummary(study1Key, null, null, preferred)

        expect(summary).not.toBeNull()
        expect(summary).toBeDefined()
        expect(summary.length).toBe(2)
        expect(summary[0].userKey).toBe(user1_key)
        expect(summary[0].isPreferred).toBe(true)
        expect(summary[1].userKey).toBe(user2_key)
        expect(summary[1].isPreferred).toBe(false)
      })

      it('we can filter by only preferred', async () => {
        let preferred = {
          include: 'only',
          researcherKey: userR1key
        }
        // studyKey, participantName, statusType, preferredParticipants, offset, count, dataCallback
        let summary = await testDAL.getLastTasksSummary(study1Key, null, null, preferred)

        expect(summary).not.toBeNull()
        expect(summary).toBeDefined()
        expect(summary.length).toBe(1)
        expect(summary[0].userKey).toBe(user1_key)
        expect(summary[0].isPreferred).toBe(true)
      })

    })
  })

})
