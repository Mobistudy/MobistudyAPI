/**
* This provides the data access for the audit log.
* Example of an audit log:
* {
    "_key": "2121212",
*   "timestamp": "2019-02-27T12:46:07.294Z",
*   "event": "userRegistered",
*   "userKey": "12123132",
*   "studyKey": "44555333",
*   "taskId": 1,
*   "message": "A new user has registered",
*   "refData": "user",
*   "refKey": "12123132"
}
*/
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, 'auditlogs')
  collection.ensureIndex({ type: 'persistent', fields: ['userKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['event'] })
}

const DAL = {
  async addAuditLog (newLog) {
    let meta = await collection.save(newLog)
    newLog._key = meta._key
    return newLog
  },

  async getLogEventTypes () {
    let query = 'FOR log IN auditlogs RETURN DISTINCT log.event'
    applogger.trace('Querying "' + query + '"')
    let cursor = await db.query(query)
    return cursor.all()
  },

  /**
   * Gets the audit logs
   * @param {Date} after optional, date after which we want the logs
   * @param {Date} before optional, date before which we want the logs
   * @param {string} eventType optional, filter log by type
   * @param {string} studyKey optional, filter logs by study key
   * @param {integer} taskId optional, filter logs by taskId
   * @param {string} userEmail optional, filter logs by user email
   * @param {string} sortDirection optional, sort logs by date, asc or desc
   * @param {integer} offset optional, used for paging
   * @param {integer} count optional, used for paging
   * @param {function} dataCallback optional when each element is sent via callback
   * @returns a Promise with the data (if dataCallback is not specified).
   * The data is either the array for each participant, or, if paging is specified (and no callback used),
   * it's an object containing the total count (including filters) in `totalCount` and the paged data in `subset`
   */
  async getAuditLogs (after, before, eventType, studyKey, taskId, userEmail, sortDirection, offset, count, dataCallback) {
    let queryString = ''
    let bindings = {}
    let queryOptions = {}

    console.log(arguments)

    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    queryString += `FOR log IN auditlogs `
    queryString += ` FOR user IN users
        FILTER user._key == log.userKey `

    if (after && before) {
      queryString += `FILTER DATE_DIFF(log.timestamp, @after, 's') <=0 AND DATE_DIFF(log.timestamp, @before, 's') >=0 `
      bindings.after = after
      bindings.before = before
    }
    if (after && !before) {
      queryString += `FILTER DATE_DIFF(log.timestamp, @after, 's') <=0 `
      bindings.after = after
    }
    if (!after && before) {
      queryString += `FILTER DATE_DIFF(log.timestamp, @before, 's') >=0 `
      bindings.before = before
    }
    if (eventType) {
      queryString += `FILTER log.event == @eventType `
      bindings.eventType = eventType
    }
    if (studyKey) {
      queryString += `FILTER log.studyKey == @studyKey `
      bindings.studyKey = studyKey
    }
    if (taskId) {
      queryString += `FILTER log.taskId == @taskId `
      bindings.taskId = taskId
    }
    if (userEmail) {
      queryString += ` FILTER LIKE(user.email, CONCAT('%', @userEmail, '%'), true) `
      bindings.userEmail = userEmail
    }
    if (!sortDirection) sortDirection = 'DESC'
    else if (sortDirection.toLowerCase() === 'asc') sortDirection = 'ASC'
    queryString += `SORT log.timestamp @sortDirection `
    bindings.sortDirection = sortDirection

    if (hasPaging) {
      queryString += `LIMIT @offset, @count `
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    queryString += ` RETURN {
          _key: log._key,
          timestamp: log.timestamp,
          event: log.event,
          userEmail: user.email,
          message: log.message,
          refData: log.refData,
          refKey: log.refKey
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

  async getLogsByUser (userKey) {
    let bindings = { 'userKey': userKey }
    let query = 'FOR log IN auditlogs FILTER log.userKey == @userKey RETURN log'
    applogger.trace('Querying "' + query + '"')
    let cursor = await db.query(query, bindings)
    return cursor.all()
  },

  // deletes a log
  async deleteLog (_key) {
    await collection.remove(_key)
    return true
  },

  async deleteLogsByUser (userKey) {
    let bindings = { 'userKey': userKey }
    let query = 'FOR log IN auditlogs FILTER log.userKey == @userKey REMOVE log IN auditlogs'
    applogger.trace('Querying "' + query + '"')
    return db.query(query, bindings)
  }
}

export { init, DAL }

