import {
  ARANGOPORT,
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as tasksResultsDAL from '../../src/DAL/tasksResultsDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

describe('Testing tasks results DAL,', () => {

  const DBNAME = 'test_tasksresults'
  let testDAL = tasksResultsDAL.DAL

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    await tasksResultsDAL.init(db)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("When adding tasks results", () => {
    let tr_key

    beforeAll(async () => {
      tr_key = await addDataToCollection('tasksResults', {
        userKey: '1234',
        studyKey: 'abc',
        data: [1, 2, 3]
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('tasksResults', tr_key)
    })

    it('The results can be retrieved by key', async () => {
      let newResults = await testDAL.getOneTaskResult(tr_key)

      expect(newResults).not.toBeNull()
      expect(newResults).toBeDefined()
      expect(newResults.userKey).toBe('1234')
      expect(newResults.studyKey).toBe('abc')
    })

    it("tasks results can be retrieved by user", async () => {
      let newResults = await testDAL.getAllTasksResults('1234')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].studyKey).toBe('abc')
    })


    it("tasks results can be retrieved by study", async () => {
      let newResults = await testDAL.getAllTasksResults(null, 'abc')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].userKey).toBe('1234')
      expect(newResults[0].studyKey).toBe('abc')
    })

    it("tasks results can be retrieved by user and study", async () => {
      let newResults = await testDAL.getAllTasksResults('1234', 'abc')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].userKey).toBe('1234')
      expect(newResults[0].studyKey).toBe('abc')
    })

  })

  describe("When adding several tasks results", () => {
    let tr1_key, tr2_key, tr3_key

    beforeAll(async () => {
      tr1_key = await addDataToCollection('tasksResults', {
        userKey: '5679', // another user
        studyKey: 'abc',
        data: [1, 2, 3]
      })

      tr2_key = await addDataToCollection('tasksResults', {
        userKey: '1234',
        studyKey: 'abc',
        data: [2, 3, 4]
      })

      tr3_key = await addDataToCollection('tasksResults', {
        userKey: '1234',
        studyKey: 'abc',
        data: [3, 4, 5]
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('tasksResults', tr1_key)
      await removeFromCollection('tasksResults', tr2_key)
      await removeFromCollection('tasksResults', tr3_key)
    })


    it('results can be retrieved one by one by user', async () => {
      let res = []
      await testDAL.getAllTasksResults('1234', null, null, null, null, (d) => {
        res.push(d)
      })

      expect(res.length).toBe(2)
    })

    it('results can be retrieved one by one by user and study', async () => {
      let res = []
      await testDAL.getAllTasksResults('1234', 'abc', null, null, null, (d) => {
        res.push(d)
      })

      expect(res.length).toBe(2)
    })

    it('results can be paged', async () => {
      let res = await testDAL.getAllTasksResults(null, null, null, 0, 2)

      expect(res.totalCount).toBe(3)
      expect(res.subset.length).toBe(2)
      expect(res.subset[0]._key).toBe(tr1_key)
      expect(res.subset[1]._key).toBe(tr2_key)
    })
  })


  describe("When adding tasks results", () => {
    let tr_key

    beforeAll(async () => {
      tr_key = await addDataToCollection('tasksResults', {
        userKey: '1234',
        studyKey: 'abc',
        data: [1, 2, 3]
      })
    }, 1000)

    // afterAll(async () => {
    //   await removeFromCollection('tasksResults', tr_key)
    // })

    it('results can be removed by key', async () => {
      await testDAL.deleteTasksResults(tr_key)

      let tr = await testDAL.getOneTaskResult(tr_key)
      expect(tr).toBeNull()
    })

    it('results can be removed by study', async () => {
      testDAL.deleteTasksResultsByStudy(tr_key)

      try {
        await testDAL.getOneTaskResult(tr_key)
      } catch (e) {
        expect(e.message).toEqual('document not found')
      }
    })

    it('results can be removed by user', async () => {
      testDAL.deleteTasksResultsByUserKey(tr_key)

      try {
        await testDAL.getOneTaskResult(tr_key)
      } catch (e) {
        expect(e.message).toEqual('document not found')
      }
    })

  })

})
