import { getAttachmentWriter, getAttachments, deleteAttachmentsByUser } from '../../src/services/attachments.mjs'
import { open as fsOpen, stat as fsStat, rmdir as fsRmdir } from 'fs/promises'

jest.mock('../../src/services/logger', () => ({
  applogger: {
    debug: jest.fn(),
    info: jest.fn(),
    trace: jest.fn()
  }
}))

describe('when saving an attachment', () => {

  afterAll(async () => {
    await fsRmdir('tasksuploads/456/', { recursive: true })
    await fsRmdir('tasksuploads/678/', { recursive: true })
  })


  test('the file is saved', async () => {
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

  test('files can be read', async () => {
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

  test('users data are deleted', async () => {
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
