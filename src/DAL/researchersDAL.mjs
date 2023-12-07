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
  async getStudyPreferences (researcherKey, studyKey) {
    let bindings = { 'researcherKey': researcherKey, 'studyKey': studyKey };
    var query = 'FOR study IN researchers FILTER study.researcherKey == @researcherKey && study.studyKey == @studyKey RETURN study';
    applogger.trace(bindings, 'Querying "' + query + '"');
    let cursor = await db.query(query, bindings);
    let researchers = await cursor.all();
    if (researchers.length) return researchers[0];
    else return undefined;
  },

  async updatePreferedPatient (researcherKey, userKey, studyKey) {
    const meta = await collection.upsert(researcherKey, userKey, studyKey)
    return meta
  }
}

export { init, DAL }
