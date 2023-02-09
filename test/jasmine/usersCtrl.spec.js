import usersCtrl from '../../src/controllers/usersCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'
import { mockObject } from '../mocks/mocker.mjs'

let sendEmailSpy

describe('Testing users controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    // mock app logger
    mockObject(applogger)
    mockObject(DAL)
  }, 100)

  afterEach(() => {
    DAL.resetMock()
  })

  it('pass recovery needs email address', async () => {
    let res = new MockResponse()
    await usersCtrl.sendPasswordResetEmail({
      body: {}
    }, res)
    expect(res.code).toBe(400)
  })

  it('pass reset needs a token', async () => {
    let res = new MockResponse()
    await usersCtrl.resetPassword({
      body: {}
    }, res)
    expect(res.code).toBe(400)
  })

  it('new user needs an email', async () => {
    let res = new MockResponse()
    await usersCtrl.createUser({
      body: {}
    }, res)
    expect(res.code).toBe(400)
  })

  it('get users can not be called by researcher', async () => {
    let res = new MockResponse()
    await usersCtrl.getUsers({
      user: {
        role: 'researcher'
      },
      body: {
      }
    }, res)
    expect(res.code).toBe(403)
  })

})
