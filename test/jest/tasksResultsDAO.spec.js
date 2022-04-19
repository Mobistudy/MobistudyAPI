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

describe("When arangodb is running", () => {
  const DBNAME = "test_tasksResults"

  beforeAll(async () => {
    await connectToDatabase(DBNAME)
    TRDAO = await getTasksResultsDAO(DB)
  }, 60000)

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

})
