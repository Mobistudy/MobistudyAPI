import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as forms from '../../src/DAL/formsDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

// Storage module used for testing
let testDAL = {}

describe("Testing forms DAL,", () => {
  const DBNAME = "test_formsDAL";

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await forms.init(db)
    Object.assign(testDAL, forms.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("When adding a form,", () => {
    let f_key

    beforeAll(async () => {
      f_key = await addDataToCollection('forms', {
        teamKey: "123123",
        name: {
          en: "Form 1"
        },
        questions: [
          {
            id: "Q1",
            type: "textOnly",
            text: {
              en: "What do you prefer?"
            }
          }
        ]
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('forms', f_key)
    })

    it('the form can be retrieved', async () => {
      let forms = await testDAL.getOneForm(f_key)
      expect(forms).not.toBeNull()
      expect(forms).toBeDefined()
      expect(forms._key).toBe(f_key)
    })

    it('all forms can be retrieved', async () => {
      let forms = await testDAL.getAllForms()
      expect(forms).not.toBeNull()
      expect(forms).toBeDefined()
      expect(forms.length).toBeGreaterThan(0)
      expect(forms[0]._key).toBe(f_key)
    })

    it('the form can be replaced', async () => {
      let forms = await testDAL.replaceForm(f_key, {
        teamKey: "123123",
        name: {
          en: "Form 1 - Updated"
        },
        questions: [
          {
            id: "Q1",
            type: "textOnly",
            text: {
              en: "What do you prefer?"
            }
          }
        ]
      })
      expect(forms).not.toBeNull()
      expect(forms).toBeDefined()
      expect(forms._key).toBe(f_key)
      expect(forms.name.en).toBe("Form 1 - Updated")
    })

    it('the form can be updated', async () => {
      let forms = await testDAL.replaceForm(f_key, {
        questions: [
          {
            id: "Q1",
            type: "textOnly",
            text: {
              en: "new question text"
            }
          }
        ]
      })
      expect(forms).not.toBeNull()
      expect(forms).toBeDefined()
      expect(forms._key).toBe(f_key)
      expect(forms.questions[0].text.en).toBe("new question text")
    })
  })

  describe("When adding a form,", () => {
    let f_key

    beforeAll(async () => {
      f_key = await addDataToCollection('forms', {
        teamKey: "123123",
        name: {
          en: "Form 1"
        },
        questions: [
          {
            id: "Q1",
            type: "textOnly",
            text: {
              en: "What do you prefer?"
            }
          }
        ]
      })
    }, 1000)

    it('the form can be deleted', async () => {
      await testDAL.deleteForm(f_key)
      let form = await testDAL.getOneForm(f_key).catch(() => null)
      expect(form).toBeNull()
    })

  })
})
