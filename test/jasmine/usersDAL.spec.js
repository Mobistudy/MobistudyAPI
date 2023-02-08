import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as users from '../../src/DAL/usersDAL.mjs'
import * as participants from '../../src/DAL/participantsDAL.mjs'
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
    await participants.init(db)
    Object.assign(testDAL, participants.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("when creating a user,", () => {
    let user_key
    afterEach(async () => {
      await removeFromCollection('users', user_key)
    })

    it('a user can be created', async () => {
      let user = await testDAL.createUser({
        email: 'dario@test.test',
        hashedPassword: 'abcabc',
        role: 'participant'
      })

      expect(user).not.toBeNull()
      expect(user).toBeDefined()
      expect(user._key).not.toBeNull()
      expect(user._key).toBeDefined()
      user_key = user._key
    })
  })

  describe("when adding one user", () => {
    let user_key

    beforeEach(async () => {
      user_key = await addDataToCollection('users', {
        email: 'dario@test.test',
        hashedPassword: 'abcabc',
        role: 'participant'
      })
    }, 1000)

    afterEach(async () => {
      try {
        await removeFromCollection('users', user_key)
      } catch (e) {
        // this is expected to fail when testing removal
      }
    })

    it('the user can be found by email', async () => {
      let user = await testDAL.findUserByEmail('dario@test.test')

      expect(user).not.toBeNull()
      expect(user).toBeDefined()
      expect(user.email).toBe('dario@test.test')
    })

    it('the user can be found by key', async () => {
      let user = await testDAL.getOneUser(user_key)

      expect(user).not.toBeNull()
      expect(user).toBeDefined()
      expect(user.email).toBe('dario@test.test')
    })

    it('the user can be updated', async () => {
      let user = await testDAL.getOneUser(user_key)

      expect(user).not.toBeNull()
      expect(user).toBeDefined()
      expect(user.email).toBe('dario@test.test')

      user.email = 'gent@test.test'

      user = await testDAL.updateUser(user_key, user)
      expect(user.email).toBe('gent@test.test')

      user = await testDAL.getOneUser(user_key)
      expect(user.email).toBe('gent@test.test')
    })

    it('the user can be removed', async () => {
      await testDAL.removeUser(user_key)

      let user = await testDAL.getOneUser(user_key)
      expect(user).toBeNull()
    })
  })

  describe("when adding 3 participants,", () => {
    let user1_key, user2_key, user3_key, part1_key, part2_key, part3_key

    beforeAll(async () => {
      user1_key = await addDataToCollection('users', {
        email: 'dario@test.test',
        hashedPassword: 'abcabc',
        role: 'participant'
      })
      part1_key = await addDataToCollection('participants', {
        userKey: user1_key,
        name: 'Dario',
        surname: 'Salvi',
        dateOfBirth: '1976-03-14',
        studies: [
          {
            studyKey: 'abc',
            currentStatus: 'accepted',
            acceptedTS: "2023-02-05T12:46:07.294Z"
          }
        ]
      })
      user2_key = await addDataToCollection('users', {
        email: 'gent@test.test',
        hashedPassword: 'abcabc',
        role: 'participant'
      })
      part2_key = await addDataToCollection('participants', {
        userKey: user2_key,
        name: 'Gent',
        surname: 'Ymeri',
        dateOfBirth: '1996-08-01',
        studies: [
          {
            studyKey: 'abc',
            currentStatus: 'accepted',
            acceptedTS: "2023-02-05T12:46:07.294Z"
          }
        ]
      })
      user3_key = await addDataToCollection('users', {
        email: 'carl@test.test',
        hashedPassword: 'abcabc',
        role: 'participant'
      })
      part3_key = await addDataToCollection('participants', {
        userKey: user3_key,
        name: 'Carl',
        surname: 'Olsson',
        dateOfBirth: '1972-11-10',
        studies: [
          {
            studyKey: 'abc',
            currentStatus: 'accepted',
            acceptedTS: "2023-02-05T12:46:07.294Z"
          }
        ]
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('users', user1_key)
      await removeFromCollection('users', user2_key)
      await removeFromCollection('users', user3_key)
      await removeFromCollection('participants', part1_key)
      await removeFromCollection('participants', part2_key)
      await removeFromCollection('participants', part3_key)
    })

    it('the users can be obtained', async () => {
      let users = await testDAL.getAllUsers()

      expect(users).not.toBeNull()
      expect(users.length).toBe(3)
      expect(users[0].email).toBe('dario@test.test')
      expect(users[1].email).toBe('gent@test.test')
      expect(users[2].email).toBe('carl@test.test')
    })

    it('the users can be queried by role', async () => {
      // countOnly, userEmail, roleType, studyKeys, sortDirection, offset, maxResultsNumber, dataCallback
      let users = await testDAL.getUsers(false, null, 'participant')

      expect(users).not.toBeNull()
      expect(users).toHaveSize(3)
      let emails = users.map((v) => {
        return v.email
      })
      expect(emails).toContain('dario@test.test')
      expect(emails).toContain('gent@test.test')
      expect(emails).toContain('carl@test.test')
    })

    it('the users can be queried by role and email address', async () => {
      // countOnly, userEmail, roleType, studyKeys, sortDirection, offset, maxResultsNumber, dataCallback
      let users = await testDAL.getUsers(false, 'dario', 'participant')

      expect(users).not.toBeNull()
      expect(users).toHaveSize(1)
      let emails = users.map((v) => {
        return v.email
      })
      expect(emails).toContain('dario@test.test')
    })

    it('the users can be queried by role and study', async () => {
      // countOnly, userEmail, roleType, studyKeys, sortDirection, offset, maxResultsNumber, dataCallback
      let users = await testDAL.getUsers(false, null, 'participant', ['abc'])

      expect(users).not.toBeNull()
      expect(users).toHaveSize(3)
      let emails = users.map((v) => {
        return v.email
      })
      expect(emails).toContain('dario@test.test')
      expect(emails).toContain('gent@test.test')
      expect(emails).toContain('carl@test.test')
    })

    it('the count of users can be got', async () => {
      // countOnly, userEmail, roleType, studyKeys, sortDirection, offset, maxResultsNumber, dataCallback
      let usersN = await testDAL.getUsers(true)

      expect(usersN).not.toBeNull()
      expect(usersN).toBe(3)
    })
  })
})
