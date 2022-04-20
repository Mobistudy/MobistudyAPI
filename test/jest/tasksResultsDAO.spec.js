import {
  DB,
  connectToDatabase,
  dropDatabase,
  addDataToCollection,
  removeFromCollection,
} from "../arangoTools"

import getTasksResultsDAO from '../../src/DAO/tasksResultsDAO'

jest.mock('../../src/services/logger', () => ({
  applogger: {
    debug: jest.fn(),
    info: jest.fn(),
    trace: jest.fn()
  }
}))

let TRDAO = null
const DBNAME = "test_tasksResultsDAO"

describe("When arangodb is running", () => {

  beforeAll(async () => {
    await connectToDatabase(DBNAME)
    TRDAO = await getTasksResultsDAO(DB)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  test("tasks results can be created", async () => {
    let newRsults = await TRDAO.createTasksResults({
      userKey: '4545',
      studyKey: 'a1a2',
      data: [1, 2, 3]
    })

    expect(newRsults._key).not.toBeNull()
    expect(newRsults._key).not.toBeUndefined()
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

    test('The results can be retrieved by key', async () => {
      let newResults = await TRDAO.getOneTaskResult(tr_key)

      expect(newResults).not.toBeNull()
      expect(newResults).toBeDefined()
      expect(newResults.userKey).toBe('1234')
      expect(newResults.studyKey).toBe('abc')
    })

    test("tasks results can be retrieved by user", async () => {
      let newResults = await TRDAO.getTasksResultsByUser('1234')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].studyKey).toBe('abc')
    })

    test("tasks results can be retrieved by study", async () => {
      let newResults = await TRDAO.getTasksResultsByStudy('abc')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].userKey).toBe('1234')
      expect(newResults[0].studyKey).toBe('abc')
    })

    test("tasks results can be retrieved by user and study", async () => {
      let newResults = await TRDAO.getTasksResultsByUserAndStudy('1234', 'abc')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].userKey).toBe('1234')
      expect(newResults[0].studyKey).toBe('abc')
    })

    afterAll(async () => {
      await removeFromCollection('tasksResults', tr_key)
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

    test('results can be retrieved one by one by user', async () => {
      let res = []
      await TRDAO.getTasksResultsByUser('1234', (d) => {
        res.push(d)
      })

      expect(res.length).toBe(2)
    })

    test('results can be retrieved one by one by user and study', async () => {
      let res = []
      await TRDAO.getTasksResultsByUserAndStudy('1234', 'abc', (d) => {
        res.push(d)
      })

      expect(res.length).toBe(2)
    })


    afterAll(async () => {
      await removeFromCollection('tasksResults', tr1_key)
      await removeFromCollection('tasksResults', tr2_key)
      await removeFromCollection('tasksResults', tr3_key)
    })
  })


  describe("When adding tasks results", () => {
    let tr_key

    beforeEach(async () => {
      tr_key = await addDataToCollection('tasksResults', {
        userKey: '1234',
        studyKey: 'abc',
        data: [1, 2, 3]
      })
    }, 1000)

    test('results can be removed by key', async () => {
      TRDAO.deleteTasksResults(tr_key)

      try {
        await TRDAO.getOneTaskResult(tr_key)
      } catch (e) {
        expect(e.message).toEqual('document not found')
      }
    })

    test('results can be removed by study', async () => {
      TRDAO.deleteTasksResultsByStudy(tr_key)

      try {
        await TRDAO.getOneTaskResult(tr_key)
      } catch (e) {
        expect(e.message).toEqual('document not found')
      }
    })

    test('results can be removed by user', async () => {
      TRDAO.deleteTasksResultsByUser(tr_key)

      try {
        await TRDAO.getOneTaskResult(tr_key)
      } catch (e) {
        expect(e.message).toEqual('document not found')
      }
    })

    afterAll(async () => {
      await removeFromCollection('tasksResults', tr_key)
    })
  })

})
