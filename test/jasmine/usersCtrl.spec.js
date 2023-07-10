import usersCtrl from '../../src/controllers/usersCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import auditLogger from '../../src/services/auditLogger.mjs'
import mailSender from '../../src/services/mailSender.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'


describe('Testing users controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    spyOnAllFunctions(applogger)
    spyOnAllFunctions(auditLogger)
    spyOnAllFunctions(mailSender)
  }, 100)


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
    spyOn(DAL, 'findUserByEmail').and.returnValue(null)
    spyOn(DAL, 'createUser').and.returnValue({
      _ey: '1234',
      email: 'dario@test.test',
      password: 'moon landing',
      role: 'participant'
    })

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
    expect(mailSender.sendEmail).toHaveBeenCalled()
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
    spyOn(DAL, 'findUserByEmail').and.returnValue({
      _key: '1234',
      email: 'dario@test.test',
      password: 'moon landing',
      role: 'participant'
    })

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
