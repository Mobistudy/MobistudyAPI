/**
 * This provides the data access for all tasks results.
 */
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const CollectionName = 'tasksResults'

export default async function (db) {
  const collection = await utils.getCollection(db, CollectionName)

  return {
    tasksResultsTransaction () {
      return CollectionName
    },

    async getAllTasksResults (dataCallback) {
      const filter = ''
      const query = 'FOR data IN ' + CollectionName + ' ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getTasksResultsByUser (userKey, dataCallback) {
      const query = 'FOR data IN ' + CollectionName + ' FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getTasksResultsByUserAndStudy (userKey, studyKey, dataCallback) {
      const query = 'FOR data IN ' + CollectionName + ' FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getTasksResultsByStudy (studyKey, dataCallback) {
      const query = 'FOR data IN ' + CollectionName + ' FILTER data.studyKey == @studyKey RETURN data'
      const bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
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
      const results = await collection.document(_key)
      return results
    },

    // deletes tasks results
    async deleteTasksResults (_key, trx) {
      if (trx) {
        await trx.step(() => collection.remove(_key))
      } else {
        await collection.remove(_key)
      }
      applogger.trace('Deleting tasks results "' + _key + '"')
      return true
    },

    // deletes all data based on study
    async deleteTasksResultsByStudy (studyKey, trx) {
      applogger.trace('Deleting all tasks results by study "' + studyKey + '"')
      const query = 'FOR data IN ' + CollectionName + ' FILTER data.studyKey == @studyKey REMOVE data._key IN ' + CollectionName
      const bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')

      if (trx) {
        await trx.step(() => db.query(query, bindings))
      } else {
        await db.query(query, bindings)
      }
    },

    // deletes all data based on user
    async deleteTasksResultsByUser (userKey, trx) {
      applogger.trace('Deleting all tasks results by user "' + userKey + '"')

      const query = 'FOR data IN ' + CollectionName + ' FILTER data.userKey == @userKey REMOVE data._key IN ' + CollectionName
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')

      if (trx) {
        await trx.step(() => db.query(query, bindings))
      } else {
        await db.query(query, bindings)
      }
    }
  }
}
