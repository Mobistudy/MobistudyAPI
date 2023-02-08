import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as users from '../../src/DAL/usersDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import { mockObject } from '../mocks/mocker.mjs'

// mock app logger
mockObject(applogger)

// Storage module used for testing
let testDAL = {}

describe('Testing users DAL with Arango,', () => {

  const DBNAME = 'test_usersDAL'

  beforeAll(async () => {
    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await users.init(db)
    Object.assign(testDAL, users.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("when adding one user", () => {
    let user_key

    beforeAll(async () => {
      user_key = await addDataToCollection('users', {
        email: 'dario@test.test',
        hashedPassword: 'abcabc',
        role: 'participant'
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('participants', user_key)
    })

    it('the user can be found by email', async () => {
      let user = await testDAL.findUserByEmail('dario@test.test')

      expect(user).not.toBeNull()
      expect(user).toBeDefined()
      expect(user.email).toBe('dario@test.test')
    })
  })

})
