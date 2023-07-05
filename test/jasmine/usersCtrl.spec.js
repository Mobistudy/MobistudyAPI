import usersCtrl from '../../src/controllers/usersCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import mailSender from '../../src/services/mailSender.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'
import { mockObject } from '../mocks/mocker.mjs'


describe('Testing users controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    mockObject(applogger)
    mockObject(mailSender)
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

  it('creating users sends an email', async () => {
    DAL.nextReturnedValuesSequence = [
      null, // when existing contact is searched
      {
        _ey: '1234',
        email: 'dario@test.test',
        password: 'moon landing',
        role: 'participant'
      } // after user has been created
    ]
    let res = new MockResponse()
    await usersCtrl.createUser({
      body: {
        email: 'dario@test.test',
        password: 'moon landing',
        role: 'participant'
      },
      acceptsLanguages () {
        return ['en', 'es']
      }
    }, res)
    expect(res.code).toBe(200)
    expect(mailSender.lastCalledFunction).toBe('sendEmail')
    expect(mailSender.lastCalledArguments[0]).toBe('dario@test.test')
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

  it('duplicate emails are not allowed', async () => {
    DAL.nextReturnedValue = {
      _key: '1234',
      email: 'dario@test.test',
      password: 'moon landing',
      role: 'participant'
    }
    let res = new MockResponse()
    await usersCtrl.createUser({
      body: {
        email: 'dario@test.test',
        password: 'moon landing',
        role: 'participant'
      },
      acceptsLanguages () {
        return ['en', 'es']
      }
    }, res)
    expect(res.code).toBe(409)
  })

})
