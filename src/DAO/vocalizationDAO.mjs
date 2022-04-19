'use strict'

/**
 * This provides the data access for the Study VocalizationData.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'vocalization'

export default async function (db, logger) {
  const collection = await utils.getCollection(db, COLLECTIONNAME)

  return {
    VocalizationTransaction () {
      return COLLECTIONNAME
    },

    async getAllVocalization (dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} RETURN data`
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getVocalizationByUser (userKey, dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} FILTER data.userKey == @userKey RETURN data`
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

    async getVocalizationsByUserAndStudy (userKey, studyKey, dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data`
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

    async getVocalizationDataByStudy (studyKey, dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} FILTER data.studyKey == @studyKey RETURN data`
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

    /**
     * Create a new Timed up & Go Test
     * @param newVocalization new Vocalization
     * @param trx optional transaction
     * @returns promise with the new created Vocalization
     */
    async createVocalization (newVocalization, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newVocalization))
      } else {
        meta = await collection.save(newVocalization)
      }
      applogger.trace(newVocalization, 'Creating timed up & go test with key ' + meta._key + '')

      newVocalization._key = meta._key
      return newVocalization
    },

    /**
     * Replaces a newVocalization
     * @param _key key of the newVocalization to replace
     * @param newData new newVocalization object
     * @param trx optional transaction
     * @returns promise with replaced newVocalization
     */
    async replaceVocalization (_key, newVocalization, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.replace(_key, newVocalization))
      } else {
        meta = await collection.replace(_key, newVocalization)
      }
      applogger.trace(newVocalization, 'Replacing timed up & go test with key ' + _key + '')

      newVocalization._key = meta._key
      return newData
    },

    async getOneVocalization (_key) {
      const newVocalization = await collection.document(_key)
      return newVocalization
    },

    // deletes VocalizationData
    async deleteVocalization (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteVocalizationByStudy (studyKey) {
      const VocalizationData = await this.getVocalizationDataByStudy(studyKey)
      for (let i = 0; i < VocalizationData.length; i++) {
        await this.deleteVocalization(VocalizationData[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteVocalizationByUser (userKey) {
      const VocalizationData = await this.getVocalizationByUser(userKey)
      for (let i = 0; i < VocalizationData.length; i++) {
        await this.deleteVocalization(VocalizationData[i]._key)
      }
    }
  }
}