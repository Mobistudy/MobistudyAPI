/**
 * This provides the data access for the task indicators.
 */
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

/**
 * Import types from the datamodels.
 * @typedef {import("../../models/jsdocs.js").TaskResultIndicator} TaskResultIndicator
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
   * @param {number} offset - offset for paging
   * @param {number} count - count for paging
   * @param {function(TaskIndicator):void} dataCallback - callback to be called for each result
   * @returns {Promise<Array<TaskResultIndicator>|{totalCount: number, subset: Array<TaskResultIndicator>}|void>} - array of task indicators, or paged result, or void if dataCallback is provided
   */
  async getAllTaskIndicators (studyKey, userKey, producer, taskIds, offset, count, dataCallback) {
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

    applogger.trace('Querying "' + query + '"')
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
   * Creates a new task indicator.
   * @param {TaskResultIndicator} indicator - indicator to create
   * @returns {Promise<TaskResultIndicator>} - the created indicator
   */
  async createTaskIndicator (newindicator) {
    const meta = await collection.save(newindicator)
    newindicator._key = meta._key
    return newindicator
  },

  /**
   * Gets a task indicator by key.
   * @param {string} _key - key of the task indicator
   * @returns {Promise<TaskResultIndicator>} - the task indicator
   */
  async getOneTaskIndicator (_key) {
    const indicator = await collection.document(_key)
    return indicator
  },

  /**
   * Replaces a task indicator.
   * @param {string} _key - key of the task indicator
   * @param {TaskResultIndicator} indicator - the new indicator
   * @returns {Promise<TaskResultIndicator>} - the updated indicator
   */
  async replaceTaskIndicator (_key, indicator) {
    const meta = await collection.replace(_key, indicator)
    indicator._key = meta._key
    return indicator
  },

  /**
   * Updates a task indicator.
   * @param {string} _key - key of the task indicator
   * @param {TaskResultIndicator} indicator - the updated indicator
   * @returns {Promise<TaskResultIndicator>} - the updated indicator
   */
  async updateTaskIndicator (_key, indicator) {
    const newval = await collection.update(_key, indicator, {
      keepNull: false,
      mergeObjects: true,
      returnNew: true
    })
    return newval.new
  },

  /**
   * Deletes a task indicator.
   * @param {string} _key - key of the task indicator
   * @returns {Promise<boolean>} - true if the task indicator was deleted
   */
  async deleteTaskIndicator (_key) {
    await collection.remove(_key)
    return true
  }
}

export { init, DAL }
