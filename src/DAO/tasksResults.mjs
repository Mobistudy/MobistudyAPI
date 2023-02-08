/**
 * This provides the data access for all tasks results.
 */
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTION_NAME = 'tasksResults'

export default async function (storage) {

  // create collection if not exists and set indexes
  const collection = await utils.getCollection(storage.db, COLLECTION_NAME)
  collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['userKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['taskId'] })
  collection.ensureIndex({ type: 'persistent', fields: ['createdTS'] })

  /**
   * Gets the transaction used for this data type
   * @returns
   */
  storage.tasksResultsTransaction = function () {
    return COLLECTION_NAME
  }

  /**
   * Gets all the tasks results.
   * The result changes depending on one's role, admins can see all,
   * researchers only those related to their studies
   * and participants only own.
   * @param {function} dataCallback used to receive data one by one
   * @returns a promise that gives an array of task results
   */
  storage.getAllTasksResults = async function (dataCallback) {
    const filter = ''
    const query = 'FOR data IN ' + COLLECTION_NAME + ' ' + filter + ' RETURN data'
    applogger.trace('Querying "' + query + '"')
    const cursor = await storage.db.query(query)
    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else return cursor.all()
  }

  /**
   * Gets the tasks results for a specific user
   * @param {string} userKey key of the user to be found
   * @param {function} dataCallback function called when retrieving one-by-one
   * @returns a promise that gives an array of task results
   */
  storage.getTasksResultsByUser = async function (userKey, dataCallback) {
    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.userKey == @userKey RETURN data'
    const bindings = { userKey: userKey }
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await storage.db.query(query, bindings)
    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else return cursor.all()
  }

  storage.getTasksResultsByUserAndStudy = async function (userKey, studyKey, dataCallback) {
    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
    const bindings = { userKey: userKey, studyKey: studyKey }
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await storage.db.query(query, bindings)
    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else return cursor.all()
  }

  storage.getTasksResultsByStudy = async function (studyKey, dataCallback) {
    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.studyKey == @studyKey RETURN data'
    const bindings = { studyKey: studyKey }
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await storage.db.query(query, bindings)
    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else return cursor.all()
  },

    // creates new tasks results
    // trx: optional, for transactions
    storage.createTasksResults = async function (newTaskResults, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newTaskResults))
      } else {
        meta = await collection.save(newTaskResults)
      }
      applogger.trace(newTaskResults, 'Creating tasks results "' + meta._key + '"')

      newTaskResults._key = meta._key
      return newTaskResults
    }

  // udpates a study, we assume the _key is the correct one
  // trx: optional, for transactions
  storage.replaceTasksResults = async function (_key, newTaskResults, trx) {
    let meta
    if (trx) {
      meta = await trx.step(() => collection.replace(_key, newTaskResults))
    } else {
      meta = await collection.replace(_key, newTaskResults)
    }
    applogger.trace(newTaskResults, 'Replacing tasks results "' + _key + '"')

    newTaskResults._key = meta._key
    return newTaskResults
  }

  storage.getOneTaskResult = async function (_key) {
    const results = await collection.document(_key, { graceful: true })
    return results
  }

  // deletes tasks results
  storage.deleteTasksResults = async function (_key, trx) {
    if (trx) {
      await trx.step(() => collection.remove(_key))
    } else {
      await collection.remove(_key)
    }
    applogger.trace('Deleting tasks results "' + _key + '"')
    return true
  }

  // deletes all data based on study
  storage.deleteTasksResultsByStudy = async function (studyKey, trx) {
    applogger.trace('Deleting all tasks results by study "' + studyKey + '"')
    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.studyKey == @studyKey REMOVE data._key IN ' + COLLECTION_NAME
    const bindings = { studyKey: studyKey }
    applogger.trace(bindings, 'Querying "' + query + '"')

    if (trx) {
      await trx.step(() => storage.db.query(query, bindings))
    } else {
      await storage.db.query(query, bindings)
    }
  }

  // deletes all data based on user
  storage.deleteTasksResultsByUser = async function (userKey, trx) {
    applogger.trace('Deleting all tasks results by user "' + userKey + '"')

    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.userKey == @userKey REMOVE data._key IN ' + COLLECTION_NAME
    const bindings = { userKey: userKey }
    applogger.trace(bindings, 'Querying "' + query + '"')

    if (trx) {
      await trx.step(() => storage.db.query(query, bindings))
    } else {
      await storage.db.query(query, bindings)
    }
  }
}
