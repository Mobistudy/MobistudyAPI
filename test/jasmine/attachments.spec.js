import { getAttachmentWriter, getAttachments, getAttachmentReader, deleteAttachmentsByUser } from '../../src/services/attachments.mjs'
import { stat as fsStat, rm as fsRm } from 'fs/promises'
import { applogger } from '../../src/services/logger.mjs'
import { mockObject } from '../mocks/mocker.mjs'

// mock app logger
mockObject(applogger)

describe('When saving an attachment', () => {

  afterAll(async () => {
    await fsRm('tasksuploads/456/', { recursive: true })
    await fsRm('tasksuploads/678/', { recursive: true })
  })


  it('the file is saved', async () => {
    let userKey = '123'
    let studyKey = '456'
    let taskId = '7'
    let fileName = '89.txt'
    let writer = await getAttachmentWriter(userKey, studyKey, taskId, fileName)
    await writer.write('text1 ')
    await writer.write('text2')
    await writer.end()
    let filePath = 'tasksuploads/456/123/7/89.txt'
    await fsStat(filePath)
  })

  it('files can be read', async () => {
    let userKey = '123'
    let studyKey = '456'
    let taskId = '7'
    let fileName = '89.txt'
    let writer = await getAttachmentWriter(userKey, studyKey, taskId, fileName)
    await writer.write('text1 ')
    await writer.write('text2')
    await writer.end()
    let study, task, user, content
    await getAttachments(studyKey, (res) => {
      study = res.study
      task = res.task
      user = res.user
      content = res.content
    })
    var enc = new TextDecoder("utf-8")
    let text = enc.decode(content)
    expect(study).toBe(studyKey)
    expect(task).toBe(task)
    expect(user).toBe(user)
    expect(text).toBe('text1 text2')
  })

  it('one file can be read as reader', async () => {
    let userKey = '123'
    let studyKey = '456'
    let taskId = '7'
    let fileName = '90.txt'
    let writer = await getAttachmentWriter(userKey, studyKey, taskId, fileName)
    await writer.write('text1 ')
    await writer.write('text2')
    await writer.end()

    let reader = await getAttachmentReader(studyKey, userKey, taskId, fileName)

    function streamToString (stream) {
      const chunks = []
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        stream.on('error', (err) => reject(err))
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
    }

    const text = await streamToString(reader)
    expect(text).toBe('text1 text2')
  })

  it('users data are deleted', async () => {
    let userKey = '123'
    let studyKey = '456'
    let taskId = '1'
    let fileName = 'ttt.txt'
    let writer = await getAttachmentWriter(userKey, studyKey, taskId, fileName)
    await writer.write('text1')
    await writer.end()

    studyKey = '678'
    taskId = '2'
    fileName = 'ttt.txt'
    writer = await getAttachmentWriter(userKey, studyKey, taskId, fileName)
    await writer.write('text2')
    await writer.end()

    await deleteAttachmentsByUser(userKey)

    try {
      stat = await fsStat('tasksuploads/456/123/')
      fail('it should not reach here')
    } catch (err) {
      // OK!
    }
    try {
      stat = await fsStat('tasksuploads/678/123/')
      fail('it should not reach here')
    } catch (err) {
      // OK!
    }

  })
})
