/**
* This provides the data access for the researcher.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

/**
 * researcherKey: <keyOfTheResearcher>
 * studyKey: <keyOfTheStudy>
 * preferedPatients: [<userId>, <userId>...]
 */
const COLLECTIONNAME = 'researchers'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, COLLECTIONNAME)
  collection.ensureIndex({ type: 'persistent', fields: ['userKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
}

const DAL = {
  async getPreferredParticipans (researcherKey, studyKey) {
    let bindings = { 'researcherKey': researcherKey, 'studyKey': studyKey }
    var query = 'FOR study IN researchers FILTER study.researcherKey == @researcherKey && study.studyKey == @studyKey RETURN study'
    applogger.trace(bindings, 'Querying "' + query + '"')
    let cursor = await db.query(query, bindings)
    let researchers = await cursor.all()
    if (researchers.length) return researchers[0]
    else return undefined
  },

  async getUpdatedDocument(researcherKey, studyKey, userKey) {
    try {
      const document = await this.getPreferredParticipans(researcherKey, studyKey)
      const updatedDocument = {
        ...document,
        preferredParticipans: document.preferredParticipans.includes(userKey)
        ? document.preferredParticipans.filter(key => key !== userKey)
        : [...document.preferredParticipans, userKey],
      }
      return updatedDocument
    } catch (err) {
      console.error(err)
    }
  },

  async setPreferredParticipant(researcherKey, studyKey, userKey) {
    try {
      const document = await this.getPreferredParticipans(researcherKey, studyKey)
  
      if (document) {
        const updatedDocument = await this.getUpdatedDocument(researcherKey, studyKey, userKey)
        await collection.update(document._id, updatedDocument)
      } else {
        const docHandle = String(researcherKey) + '-' + String(studyKey)
        await collection.save({
          _key: docHandle,
          researcherKey,
          studyKey,
          preferredParticipans: [userKey.toString()]
        })
      }
    } catch (err) {
      console.error(err)
    }
  }
}
export { init, DAL }
