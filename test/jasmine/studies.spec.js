import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as studies from '../../src/DAL/studiesDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

// Storage module used for testing
let testDAL = {}

const testStudy = {
  invitationCode: '555777',
  generalities: {
    languages: ['en', 'it'],
    title: {
      en: 'teststudy',
      it: 'studio test'
    }
  },
  consent: {
    taskItems: [{
      description: {
        en: 'task1',
        it: 'attivita 1'
      },
      taskId: 1
    }],
    extraItems: [{
      description: {
        en: 'extra1',
        it: 'addizionale 1'
      }
    }]
  }
}

function generateStudy (i) {
  return {
    invitationCode: i + '00000',
    generalities: {
      languages: ['en', 'it'],
      title: {
        en: 'teststudy' + i,
        it: 'studio test' + i
      }
    },
    consent: {
      taskItems: [{
        description: {
          en: 'task 1 ' + i,
          it: 'attivita 1 ' + i
        },
        taskId: 1
      }],
      extraItems: [{
        description: {
          en: 'extra 1 ' + i,
          it: 'addizionale 1 ' + i
        }
      }]
    }
  }
}

describe('Testing studies DAL with Arango,', () => {

  const DBNAME = 'test_studiesDAL'

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await studies.init(db)
    Object.assign(testDAL, studies.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  it('a study can be created', async () => {
    let study = await testDAL.createStudy(testStudy)

    expect(study).not.toBeNull()
    expect(study).toBeDefined()
    expect(study._key).not.toBeNull()
    expect(study._key).toBeDefined()
    await removeFromCollection('studies', study._key)
  })

  describe("with one study,", () => {
    let study_key
    beforeAll(async () => {
      study_key = await addDataToCollection('studies', testStudy)
    })

    afterAll(async () => {
      await removeFromCollection('studies', study_key)
    })

    it('the study can be retrieved', async () => {
      let study = await testDAL.getOneStudy(study_key)

      expect(study).not.toBeNull()
      expect(study).toBeDefined()
      expect(study.generalities.title.en).toBe(testStudy.generalities.title.en)
    })

    it('the study can be retrieved', async () => {
      let study = await testDAL.getOneStudy(study_key)

      expect(study).not.toBeNull()
      expect(study).toBeDefined()
      expect(study.generalities.title.en).toBe(testStudy.generalities.title.en)
    })

    it('a new code can be generated', async () => {
      let code = await testDAL.getNewInvitationCode()

      expect(code).not.toBeNull()
      expect(code).toBeDefined()
      expect(code).not.toBe(testStudy.invitationCode)
    })

    it('a study can be found by code', async () => {
      let study = await testDAL.getInvitationalStudy(testStudy.invitationCode)

      expect(study).not.toBeNull()
      expect(study).toBeDefined()
      expect(study._key).toBe(study_key)
    })
  })

  describe("with multiple studies,", () => {
    let studies = []
    beforeAll(async () => {
      for (let i = 0; i < 10; i++) {
        studies[i] = generateStudy(i)
        studies[i]._key = await addDataToCollection('studies', studies[i])
      }
    })

    afterAll(async () => {
      for (let i = 0; i < 10; i++) {
        await removeFromCollection('studies', studies[i]._key)
      }
    })

    it('the studies can be retrieved', async () => {
      let studies = await testDAL.getAllStudies()

      expect(studies).not.toBeNull()
      expect(studies).toBeDefined()
      expect(studies.length).toBe(10)
      for (let i = 0; i < 10; i++) {
        expect(studies[i].generalities.title.en).toBe('teststudy' + i)
      }
    })

    it('the studies can be paged', async () => {
      let studies = await testDAL.getStudies(null, 0, 5)

      expect(studies).not.toBeNull()
      expect(studies).toBeDefined()
      expect(studies.totalCount).toBe(10)
      expect(studies.subset.length).toBe(5)
    })
  })
})
