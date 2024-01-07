import zipper from '../../src/services/dataZipper.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import * as attachments from '../../src/services/attachments.mjs'
import { rm as fsRmdir } from 'fs/promises'

const DBNAME = 'test_zipper'


describe('When testing the zipper,', () => {
  beforeAll(async () => {
    await DAL.extendDAL()

    // mock app logger
    spyOnAllFunctions(applogger)
  })

  describe('when a participant and some answers are stored,', () => {

    beforeAll(async () => {
      spyOn(DAL, 'getUsers').and.callFake(async (a1, a2, a3, a4, a5, a6, cbk) => {
        cbk({
          _key: '111111',
          email: 'dario.salvi@test.test'
        })
      })
      spyOn(DAL, 'getParticipantsByStudy').and.callFake(async (a1, a2, a3, a4, cbk) => {
        cbk({
          _key: '0000',
          userKey: '111111',
          createdTS: "2019-02-27T12:46:07.294Z",
          name: "Dario",
          surname: "Salvi",
          sex: "male",
          dateOfBirth: "2019-02-27T12:46:07.294Z",
          country: "gb",
          language: "en",
          height: 180,
          weight: 78,
          diseases: [],
          medications: [],
          studiesSuggestions: true,
          studies: [{
            studyKey: "123456",
            currentStatus: "accepted",
            acceptedTS: "2019-02-27T12:46:07.294Z",
            taskItemsConsent: [{
              taskId: 1,
              consented: true,
              lastExecuted: "2019-02-27T12:46:07.294Z"
            },
            {
              taskId: 2,
              consented: true,
              lastExecuted: "2019-02-27T12:46:07.294Z"
            }]
          }]
        })
      })
      spyOn(DAL, 'getAllTasksResults').and.callFake(async (a1, a2, a3, a4, cbk) => {
        cbk({
          _key: '2121212',
          taskId: 1,
          summary: {
            somedata: true
          }
        })
        cbk({
          _key: '12121212',
          taskId: 2,
          summary: {
            somedata: false
          }
        })
      })
      spyOn(attachments, 'getAttachments').and.callFake(async (a1, cbk) => {
        cbk({
          userKey: '111111',
          participatnKey: '0000',
          taskId: 1
        })
        cbk({
          userKey: '111111',
          participatnKey: '0000',
          taskId: 2
        })
      })
    })

    it('a zip file can be created', async () => {
      let filename = await zipper.zipStudyData("123456")
      expect(filename).toBeDefined()
    })

    it('purging files doesnt crash', async () => {
      await zipper.purgeOldFiles(-1)
    })

    afterAll(async () => {
      await zipper.purgeOldFiles(-1)
    })
  })
})
