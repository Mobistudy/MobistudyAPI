/**
 * This provides the data access for all tasks results.
 */
import * as Types from '../../models/jsdocs.js'

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTION_NAME = 'tasksResults'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, COLLECTION_NAME)
  collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['userKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['taskId'] })
  collection.ensureIndex({ type: 'persistent', fields: ['createdTS'] })
}

const DAL = {
  /**
   * Gets the transaction used for this data type
   * @returns {string}
   */
  tasksResultsTransaction () {
    return COLLECTION_NAME
  },

  /**
   * Gets all tasks result.
   * Optional query parameters by user key and study key.
   * @param {?string} participantUserKey - participant user key
   * @param {?string} studyKey - study key
   * @param {?number} offset - optional, starting from result N, used for paging
   * @param {?number} count - optional, number of results to be returned, used for paging
   * @param {?Function} dataCallback - optional, callback used when receiving data one by one (except when using pagination)
   * @returns {Promise<Array<Types.TaskResults> | Types.PagedQueryResult<Types.TaskResults> | null>} a promise that passes the data as an array, or empty if dataCallback is specified
   */
  async getAllTasksResults (participantUserKey, studyKey, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    let bindings = {}
    let queryOptions = {}

    let query = `FOR data IN ${COLLECTION_NAME}`
    if (studyKey) {
      bindings.studyKey = studyKey
      query += `
      FILTER data.studyKey == @studyKey
      `
    }
    if (participantUserKey) {
      bindings.participantUserKey = participantUserKey
      query += `
      FILTER data.userKey == @participantUserKey
      `
    }

    if (hasPaging) {
      query += `
      LIMIT @offset, @count
      `
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    query += `
    RETURN data`

    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings, queryOptions)
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

  // creates new tasks results
  // trx: optional, for transactions
  async createTasksResults (newTaskResults, trx) {
    let meta
    if (trx) {
      meta = await trx.step(() => collection.save(newTaskResults))
    } else {
      meta = await collection.save(newTaskResults)
    }
    applogger.trace(newTaskResults, 'Creating tasks results "' + meta._key + '"')

    newTaskResults._key = meta._key
    return newTaskResults
  },

  // udpates a study, we assume the _key is the correct one
  // trx: optional, for transactions
  async replaceTasksResults (_key, newTaskResults, trx) {
    let meta
    if (trx) {
      meta = await trx.step(() => collection.replace(_key, newTaskResults))
    } else {
      meta = await collection.replace(_key, newTaskResults)
    }
    applogger.trace(newTaskResults, 'Replacing tasks results "' + _key + '"')

    newTaskResults._key = meta._key
    return newTaskResults
  },

  async getOneTaskResult (_key) {
    const results = await collection.document(_key, { graceful: true })
    return results
  },

  /**
   * Deletes tasks results by key
   * @param {string} key - key fo the results
   * @param {string} trx - transaction
   * @returns
   */
  async deleteTasksResults (key, trx) {
    if (trx) {
      await trx.step(() => collection.remove(key))
    } else {
      await collection.remove(key)
    }
    applogger.trace('Deleting tasks results "' + key + '"')
    return true
  },

  /**
   * Deletes all data based on study
   * @param {string} studyKey
   * @param {string} trx
   */
  async deleteTasksResultsByStudy (studyKey, trx) {
    applogger.trace('Deleting all tasks results by study "' + studyKey + '"')
    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.studyKey == @studyKey REMOVE data._key IN ' + COLLECTION_NAME
    const bindings = { studyKey: studyKey }
    applogger.trace(bindings, 'Querying "' + query + '"')

    if (trx) {
      await trx.step(() => db.query(query, bindings))
    } else {
      await db.query(query, bindings)
    }
  },

  /**
   * Deletes all data based on user
   * @param {string} userKey
   * @param {string} trx
   */
  async deleteTasksResultsByUserKey (userKey, trx) {
    applogger.trace('Deleting all tasks results by user "' + userKey + '"')

    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.userKey == @userKey REMOVE data._key IN ' + COLLECTION_NAME
    const bindings = { userKey: userKey }
    applogger.trace(bindings, 'Querying "' + query + '"')

    if (trx) {
      await trx.step(() => db.query(query, bindings))
    } else {
      await db.query(query, bindings)
    }
  }
}

export { init, DAL }
