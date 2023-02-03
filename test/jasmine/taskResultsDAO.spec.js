import {
  ARANGOPORT,
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import axios from 'axios'
import getTasksResultsDAO from '../../src/DAO/tasksResultsDAO.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { fakeLogger } from '../mocks/logger.mjs'

// mock app logger
Object.assign(applogger, fakeLogger)

let TRDAO

describe('Testing tasks results DAO, when arangodb is running,', () => {

  const DBNAME = 'test_tasksresults'

  beforeAll(async () => {
    let db = await connectToDatabase(DBNAME)
    TRDAO = await getTasksResultsDAO(db)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  it('user mobistudy can access db test_tasksresults', async () => {
    let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/' + DBNAME + '/', {
      auth: {
        username: 'mobistudy',
        password: 'testpwd'
      }
    })
    expect(resp.status).toBe(200)
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
      let newResults = await TRDAO.getOneTaskResult(tr_key)

      expect(newResults).not.toBeNull()
      expect(newResults).toBeDefined()
      expect(newResults.userKey).toBe('1234')
      expect(newResults.studyKey).toBe('abc')
    })

    it("tasks results can be retrieved by user", async () => {
      let newResults = await TRDAO.getTasksResultsByUser('1234')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].studyKey).toBe('abc')
    })


    it("tasks results can be retrieved by study", async () => {
      let newResults = await TRDAO.getTasksResultsByStudy('abc')

      expect(newResults).not.toBeNull()
      expect(newResults.length).toBe(1)
      expect(newResults[0]._key).toBe(tr_key)
      expect(newResults[0].userKey).toBe('1234')
      expect(newResults[0].studyKey).toBe('abc')
    })

    it("tasks results can be retrieved by user and study", async () => {
      let newResults = await TRDAO.getTasksResultsByUserAndStudy('1234', 'abc')

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
      await TRDAO.getTasksResultsByUser('1234', (d) => {
        res.push(d)
      })

      expect(res.length).toBe(2)
    })

    it('results can be retrieved one by one by user and study', async () => {
      let res = []
      await TRDAO.getTasksResultsByUserAndStudy('1234', 'abc', (d) => {
        res.push(d)
      })

      expect(res.length).toBe(2)
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
      await TRDAO.deleteTasksResults(tr_key)

      let tr = await TRDAO.getOneTaskResult(tr_key)
      expect(tr).toBeNull()
    })

    it('results can be removed by study', async () => {
      TRDAO.deleteTasksResultsByStudy(tr_key)

      try {
        await TRDAO.getOneTaskResult(tr_key)
      } catch (e) {
        expect(e.message).toEqual('document not found')
      }
    })

    it('results can be removed by user', async () => {
      TRDAO.deleteTasksResultsByUser(tr_key)

      try {
        await TRDAO.getOneTaskResult(tr_key)
      } catch (e) {
        expect(e.message).toEqual('document not found')
      }
    })

  })

})
