/**
* This provides the data access for users.
* A user has basic authentication and data access information:
* {
*   email: 'aas@as.com',
*   hashedPassword: 'asdasdasdasdads',
*   role: 'participant', (or 'admin', 'researcher')
* }
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTION_NAME = 'users'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  // create collection if not exists and set indexes
  collection = await utils.getCollection(db, COLLECTION_NAME)
  collection.ensureIndex({ type: 'persistent', fields: ['email'] })
}

const DAL = {
  /**
   * Gets transaction for users
   * @returns {string}
   */
  usersTransaction () {
    return COLLECTION_NAME
  },

  /**
   * Finds one user by email address
   * @param {string} email
   * @returns a promise that passes the user object, undefined if user is not found
   */
  findUserByEmail: async function (email) {
    // Email string is set to lowercase
    const query = 'FOR user in users FILTER LOWER(user.email) == @userEmail RETURN user'
    const bindings = {
      userEmail: email
    }
    applogger.trace({ bindings }, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    const users = await cursor.all()
    if (users.length) return users[0]
    else return undefined
  },

  /**
   * Creates a new user
   * @param {object} newuser new user object
   * @returns a promise
   */
  createUser: async function (newuser) {
    const meta = await collection.save(newuser)
    newuser._key = meta._key
    return newuser
  },

  /**
   * Gets a user given its key
   * @param {string} userkey
   * @returns a promise that passes a user object
   */
  getOneUser: async function (userkey) {
    const user = await collection.document(userkey, { graceful: true })
    applogger.trace('Searching for user "' + userkey)
    return user
  },

  /**
   * Gets users given some query parameters
   * @param {string} userEmail - optional, email address, even partial, of the user
   * @param {string} roleType - optional, type of user: participant, researcher, admin
   * @param {string} studyKeys - optional, array of study keys the user is involved in (either as participant or researcher), role must be specified
   * @param {string} sortDirection - optional, sorting email direction, can be 'asc' or 'desc'
   * @param {number} offset - optional, starting from result N, used for paging
   * @param {number} count - optional, number of results to be returned, used for paging
   * @param {function} dataCallback - optional, callback used when receiving data one by one (except when using pagination)
   * @returns a promise that passes the data as an array (or empty if dataCallback is specified)
   */
  getUsers: async function (userEmail, roleType, studyKeys, sortDirection, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    const bindings = {}
    let queryOptions = {}
    let queryString = 'FOR user IN users '

    if (roleType) {
      if (roleType === 'participant') {
        queryString += ' FILTER user.role == "participant" '
        if (studyKeys) {
          queryString += ` FOR participant in participants
          FILTER participant.userKey == user._key AND participant.studies != null AND IS_ARRAY(participant.studies)  AND LENGTH( INTERSECTION (participant.studies[*].studyKey, @studyKeys) ) > 0 `
          bindings.studyKeys = studyKeys
        }
      } else if (role === 'researcher') {
        queryString += ' FILTER user.role == "participant" '
        if (studyKeys) {
          queryString += ` FOR team in teams FOR study in studies
          FILTER user._key IN team.researchersKeys AND study.teamKey == team._key AND study._key IN @studyKeys `
          bindings.studyKeys = studyKeys
        }
      }
    }

    if (userEmail) {
      queryString += 'FILTER LIKE(user.email, CONCAT(\'%\', @userEmail, \'%\'), true) '
      bindings.userEmail = userEmail
    }

    if (sortDirection && sortDirection.toLowerCase() == 'asc') {
      sortDirection = 'ASC'
    } else {
      sortDirection = 'DESC' // default
    }
    queryString += 'SORT user.email @sortDirection '
    bindings.sortDirection = sortDirection

    if (hasPaging) {
      queryString += `LIMIT @offset, @count `
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    queryString += ` RETURN {
          _key: user._key,
          email: user.email,
          role: user.role,
          testUser: user.testUser
        }`

    applogger.trace(bindings, 'Querying "' + queryString + '"')
    const cursor = await db.query(queryString, bindings, queryOptions)
    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else {
      if (hasPaging) {
        return {
          totalCount: cursor.extra.stats.fullCount,
          subset: await cursor.all()
        }
      } else {
        return cursor.all()
      }
    }
  },

  // Get all users in DB
  getAllUsers: async function () {
    const query = 'FOR user in users RETURN user'
    applogger.trace('Querying "' + query + '"')
    const cursor = await db.query(query)
    return cursor.all()
  },

  // udpates a user, we assume the _key is the correct one
  updateUser: async function (_key, newuser) {
    const newval = await collection.update(_key, newuser, { keepNull: false, mergeObjects: true, returnNew: true })
    return newval.new
  },

  // remove a user by Key
  removeUser: async function (userKey) {
    return collection.remove(userKey)
  }
}
export { init, DAL }

