import attachmentsCtrl from '../../src/controllers/attachmentsCtrl.mjs'
import { rm as fsRm } from 'fs/promises'
import { getAttachmentWriter } from '../../src/services/attachments.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'
import { mockObject } from '../mocks/mocker.mjs'

describe('Testing attachments controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    // mock app logger and DAL
    mockObject(applogger)
    mockObject(DAL)
  }, 1000)

  afterEach(() => {
    DAL.resetMock()
  })

  it('no study key no party', async () => {
    let res = new MockResponse()
    await attachmentsCtrl.getAttachment({
      user: {
        role: 'researcher'
      },
      params: {
      }
    }, res)
    expect(res.code).toBe(400)
  })

  it('no user key no party', async () => {
    let res = new MockResponse()
    await attachmentsCtrl.getAttachment({
      user: {
        role: 'researcher'
      },
      params: {
        studyKey: '1234'
      }
    }, res)
    expect(res.code).toBe(400)
  })

  describe('when adding a file,', () => {
    let userKey = '123'
    let studyKey = '555'
    let taskId = '7'
    let fileName = '89.txt'

    beforeAll(async () => {
      // write the file
      let writer = await getAttachmentWriter(userKey, studyKey, taskId, fileName)
      await writer.write('text1 ')
      await writer.write('text2')
      await writer.end()
    }, 1000)

    afterEach(async () => {
      // delete the file
      await fsRm('tasksuploads/555/', { recursive: true })
    })

    it('a researcher can access a single file', async () => {
      DAL.nextReturnedValuesSequence = [
        // study
        {
          _key: 'fake'
        },
        // teams
        [{}]
      ]
      let res = new MockResponse()
      await attachmentsCtrl.getAttachment({
        user: {
          role: 'researcher'
        },
        params: {
          studyKey,
          userKey,
          taskId,
          fileName
        }
      }, res)

      // stop the test until the write stream is closed
      await new Promise((resolve, reject) => {
        res.on('error', reject)
        res.on('close', resolve)
      })

      // read the response from writer
      let fileContent = res.readChunks()
      expect(fileContent).toBe('text1 text2')
    })

  })
})
