/**
 * This provides the data access for the task indicators.
 */
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

/**
 * Import types from the datamodels.
 * @typedef {import("../../models/jsdocs.js").TaskResultIndicators} TaskResultIndicators
 */


let collection, db

const COLLECTION_NAME = 'tasksResultsIndicators'


/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, COLLECTION_NAME)
  collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['userKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['producer'] })
}

const DAL = {
  /**
  * Gets transaction for task indicators
  * @returns {string}
  */
  taskIndicatorsTransaction () {
    return COLLECTION_NAME
  },

  /**
   * Gets all task indicators for a study, user and task ids.
   * If offset and count are provided, it will return a paged result.
   * If a dataCallback is provided, it will be called for each result.
   * @param {!string} studyKey - key of the study
   * @param {!string} userKey - key of the user
   * @param {string} producer - name of the producer of the indicator
   * @param {Array<string>} taskIds - ids of the tasks
   * @param {string} date - date of the indicator
   * @param {number} offset - offset for paging
   * @param {number} count - count for paging
   * @param {function(TaskIndicator):void} dataCallback - callback to be called for each result
   * @returns {Promise<Array<TaskResultIndicators>|{totalCount: number, subset: Array<TaskResultIndicators>}|void>} - array of task indicators, or paged result, or void if dataCallback is provided
   */
  async getAllTaskIndicators (studyKey, userKey, producer, taskIds, date, offset, count, dataCallback) {
    if (!studyKey) throw new Error('studyKey is required')
    if (!userKey) throw new Error('userKey is required')

    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    let bindings = {}
    let queryOptions = {}

    let query = `FOR data IN ${COLLECTION_NAME}`
    bindings.studyKey = studyKey
    query += `
      FILTER data.studyKey == @studyKey
      `
    bindings.userKey = userKey
    query += `
      FILTER data.userKey == @userKey
      `
    if (producer) {
      bindings.producer = producer
      query += `
      FILTER data.producer == @producer
      `
    }

    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      bindings.taskIds = taskIds
      query += `
      FILTER COUNT(INTERSECTION( data.taskIds, @taskIds)) > 0
      `
    }

    if (date) {
      bindings.date = date
      // compare up to the minute, ignore seconds and milliseconds
      query += `
      FILTER DATE_COMPARE(data.indicatorsDate, @date, "years", "minutes")
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

    query += ` SORT data.createdTS ASC
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

  /**
   * Gets task keys of unprocessed task results for a study, user, producer and task ids.
   * @param {string} studyKey - key of the study
   * @param {string} userKey - key of the user
   * @param {string} producer - name of the producer of the indicator
   * @param {Array<string>} taskIds - ids of the tasks
   * @returns {Promise<Array<string>} - array of task result keys
   */
  async findUnprocessedTaskResults (studyKey, userKey, producer, taskIds) {
    if (!studyKey) throw new Error('studyKey is required')
    if (!userKey) throw new Error('userKey is required')
    if (!producer) throw new Error('producer is required')
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) throw new Error('taskIds is required')

    let bindings = {}

    let query = `LET processedKeys = ( FOR key IN FLATTEN( FOR data IN ${COLLECTION_NAME}
      FILTER data.studyKey == @studyKey
      FILTER data.userKey == @userKey
      FILTER data.producer == @producer
      FILTER COUNT(INTERSECTION( data.taskIds, @taskIds)) > 0
      RETURN data.taskResultsKeys)
      RETURN DISTINCT key
      )
      `
    bindings.studyKey = studyKey
    bindings.userKey = userKey
    bindings.producer = producer
    bindings.taskIds = taskIds

    query += `
      FOR tr IN tasksResults
      FILTER tr.studyKey == @studyKey AND tr.userKey == @userKey AND tr.taskId IN @taskIds
      FILTER tr._key NOT IN processedKeys
      SORT tr.createdTS DESC
      `
    query += `
      COLLECT taskResultKey = tr._key
      RETURN {
        "taskResultKey": taskResultKey
      }`

    applogger.trace('Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    return cursor.all()
  },

  /**
   * Creates a new task indicator.
   * @param {TaskResultIndicators} indicator - indicator to create
   * @param {object} trx - optional transaction
   * @returns {Promise<TaskResultIndicators>} - the created indicator
   */
  async createTaskIndicator (newindicator, trx) {
    let meta
    if (trx) {
      meta = await trx.step(() => collection.save(newindicator))
    } else {
      meta = await collection.save(newindicator)
    }
    newindicator._key = meta._key
    return newindicator
  },

  /**
   * Gets a task indicator by key.
   * @param {string} _key - key of the task indicator
   * @returns {Promise<TaskResultIndicators>} - the task indicator
   */
  async getOneTaskIndicator (_key) {
    const indicator = await collection.document(_key)
    return indicator
  },

  /**
   * Replaces a task indicator.
   * @param {string} _key - key of the task indicator
   * @param {TaskResultIndicators} indicator - the new indicator
   * @param {object} trx - optional transaction
   * @returns {Promise<TaskResultIndicators>} - the updated indicator
   */
  async replaceTaskIndicator (_key, indicator, trx) {
    let meta
    if (trx) {
      meta = await trx.step(() => collection.replace(_key, indicator))
    } else {
      meta = await collection.replace(_key, indicator)
    }
    indicator._key = meta._key
    return indicator
  },

  /**
   * Updates a task indicator.
   * @param {string} _key - key of the task indicator
   * @param {TaskResultIndicators} indicator - the updated indicator
   * @param {object} trx - optional transaction
   * @returns {Promise<TaskResultIndicators>} - the updated indicator
   */
  async updateTaskIndicator (_key, indicator, trx) {
    let newval
    if (trx) {
      newval = await trx.step(() => collection.update(_key, indicator, {
        keepNull: false,
        mergeObjects: true,
        returnNew: true
      }))
    } else {
      newval = await collection.update(_key, indicator, {
        keepNull: false,
        mergeObjects: true,
        returnNew: true
      })
    }
    return newval.new
  },

  /**
   * Deletes a task indicator.
   * @param {string} _key - key of the task indicator
   * @returns {Promise<boolean>} - true if the task indicator was deleted
   */
  async deleteTaskIndicator (_key, trx) {
    if (trx) {
      await trx.step(() => collection.remove(_key))
    } else {
      await collection.remove(_key)
    }
    return true
  }
}

export { init, DAL }
