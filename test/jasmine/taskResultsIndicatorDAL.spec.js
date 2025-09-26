import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as taskResultsIndicatorsDAL from '../../src/DAL/taskResultsIndicatorsDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

// Storage module used for testing
let testDAL = {}

describe("Testing task indicators DAL,", () => {
  const DBNAME = "test_taskResultsIndicatorsDAL";

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await taskResultsIndicatorsDAL.init(db)
    Object.assign(testDAL, taskResultsIndicatorsDAL.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("when adding one indicator,", () => {
    let tri_key

    beforeAll(async () => {
      tri_key = await addDataToCollection('tasksResultsIndicators', {
        userKey: "123123",
        studyKey: "study1",
        producer: "producer1",
        createdTS: "2023-01-01T00:00:00Z",
        taskIds: [1, 2],
        taskResultsIds: ["tr1", "tr2"],
        indicators: {
          indicator1: [
            { date: "2023-01-01", value: 10 },
            { date: "2023-01-02", value: 15 }
          ],
          indicator2: [
            { date: "2023-01-01", value: 20 }
          ]
        }
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('tasksResultsIndicators', tri_key)
    })

    it('the indicator can be retrieved', async () => {
      let tri = await testDAL.getOneTaskIndicator(tri_key)
      expect(tri).not.toBeNull()
      expect(tri).toBeDefined()
      expect(tri._key).toBe(tri_key)
      expect(tri.studyKey).toBe('study1')
    })

    it('the indicator can be replaced', async () => {
      let forms = await testDAL.replaceTaskIndicator(tri_key, {
        userKey: "123123",
        studyKey: "study1",
        producer: "producer2",
        createdTS: "2023-01-01T00:00:00Z",
        taskIds: [1, 2],
        taskResultsIds: ["tr1", "tr2"],
        indicators: {
          indicator1: [
            { date: "2023-01-01", value: 10 },
            { date: "2023-01-02", value: 15 }
          ],
          indicator2: [
            { date: "2023-01-01", value: 20 }
          ]
        }
      })
      expect(forms).not.toBeNull()
      expect(forms).toBeDefined()
      expect(forms.producer).toBe('producer2')
    })

    it('the indicator can be updated', async () => {
      let indicator = await testDAL.updateTaskIndicator(tri_key, {
        userKey: "321321",
      })
      expect(indicator).not.toBeNull()
      expect(indicator).toBeDefined()
      expect(indicator._key).toBe(tri_key)
      expect(indicator.userKey).toBe("321321")
    })
  })

  describe("when adding one indicator,", () => {
    let tri_key

    beforeAll(async () => {
      tri_key = await addDataToCollection('tasksResultsIndicators', {
        userKey: "123123",
        studyKey: "study1",
        producer: "producer1",
        createdTS: "2023-01-01T00:00:00Z",
        taskIds: [1, 2],
        taskResultsIds: ["tr1", "tr2"],
        indicators: {
          indicator1: [
            { date: "2023-01-01", value: 10 },
            { date: "2023-01-02", value: 15 }
          ],
          indicator2: [
            { date: "2023-01-01", value: 20 }
          ]
        }
      })
    }, 1000)

    afterAll(async () => {
      // await removeFromCollection('tasksResultsIndicators', tri_key)
    })

    it('the indicator can be deleted', async () => {
      await testDAL.deleteTaskIndicator(tri_key)
      let indicator = await testDAL.getOneTaskIndicator(tri_key).catch(() => null)
      expect(indicator).toBeNull()
    })
  })

  describe("when adding some indicators,", () => {
    let tri_key1, tri_key2

    beforeAll(async () => {
      tri_key1 = await addDataToCollection('tasksResultsIndicators', {
        userKey: "123123",
        studyKey: "study1",
        producer: "producer1",
        createdTS: "2023-01-01T00:00:00Z",
        taskIds: [1, 2],
        taskResultsIds: ["tr1", "tr2"],
        indicators: {
          indicator1: [
            { date: "2023-01-01", value: 10 },
            { date: "2023-01-02", value: 15 }
          ],
          indicator2: [
            { date: "2023-01-01", value: 20 }
          ]
        }
      })

      tri_key2 = await addDataToCollection('tasksResultsIndicators', {
        userKey: "123123",
        studyKey: "study1",
        producer: "producer2",
        createdTS: "2023-01-01T00:00:00Z",
        taskIds: [1, 3],
        taskResultsIds: ["tr1", "tr3"],
        indicators: {
          indicator3: [
            { date: "2023-01-01", value: 10 },
            { date: "2023-01-02", value: 15 }
          ]
        }
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('tasksResultsIndicators', tri_key1)
      await removeFromCollection('tasksResultsIndicators', tri_key2)
    })

    it('the indicators can be found based on producer', async () => {
      let indicators = await testDAL.getAllTaskIndicators("study1", "123123", "producer1")
      expect(indicators).toBeDefined()
      expect(indicators.length).toBe(1)
      expect(indicators[0]._key).toBe(tri_key1)
    })

    it('the indicators can be found by task ids', async () => {
      let indicators = await testDAL.getAllTaskIndicators("study1", "123123", null, [1])
      expect(indicators).toBeDefined()
      expect(indicators.length).toBe(2)
      expect(indicators[0]._key).toBe(tri_key1)
      expect(indicators[1]._key).toBe(tri_key2)

      indicators = await testDAL.getAllTaskIndicators("study1", "123123", null, [3])
      expect(indicators).toBeDefined()
      expect(indicators.length).toBe(1)
      expect(indicators[0]._key).toBe(tri_key2)
    })
  })

})
