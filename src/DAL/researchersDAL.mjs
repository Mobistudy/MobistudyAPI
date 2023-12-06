/**
* This provides the data access for the researcher.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

/**
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
  async getStudyPreferences (studyKey) {
    let bindings = { 'key': studyKey }
    var query = 'FOR study in researchers FILTER study._key == @key RETURN study'
    applogger.trace(bindings, 'Querying "' + query + '"')
    let cursor = await db.query(query, bindings)
    let researchers = await cursor.all()
    if (researchers.length) return researchers[0]
    else return undefined
  },

  async addPreferedPatient (userKey, studyKey) {
    const meta = await collection.save(userKey)
    newuser._key = meta._key
    return meta
  },

  // async replaceTeam (_key, team) {
  //  let meta = await collection.replace(_key, team)
  //  team._key = meta._key
  //  return team
  // }
}

export { init, DAL }
