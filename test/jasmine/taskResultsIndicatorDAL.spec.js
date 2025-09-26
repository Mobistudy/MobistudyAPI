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

  describe("When adding indicators,", () => {
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

    // it('all forms can be retrieved', async () => {
    //   let forms = await testDAL.getAllForms()
    //   expect(forms).not.toBeNull()
    //   expect(forms).toBeDefined()
    //   expect(forms.length).toBeGreaterThan(0)
    //   expect(forms[0]._key).toBe(f_key)
    // })

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

  // describe("When adding a form,", () => {
  //   let f_key

  //   beforeAll(async () => {
  //     f_key = await addDataToCollection('forms', {
  //       teamKey: "123123",
  //       name: {
  //         en: "Form 1"
  //       },
  //       questions: [
  //         {
  //           id: "Q1",
  //           type: "textOnly",
  //           text: {
  //             en: "What do you prefer?"
  //           }
  //         }
  //       ]
  //     })
  //   }, 1000)

  //   it('the form can be deleted', async () => {
  //     await testDAL.deleteForm(f_key)
  //     let form = await testDAL.getOneForm(f_key).catch(() => null)
  //     expect(form).toBeNull()
  //   })

  // })
})
