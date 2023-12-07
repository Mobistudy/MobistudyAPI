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

  async getIfPatientAlreadyInPreferences(researcherKey, studyKey, userKey) {
    let bindings = { 'researcherKey': researcherKey, 'studyKey': studyKey };
    var query = 'FOR study IN researchers FILTER study.researcherKey == @researcherKey && study.studyKey == @studyKey RETURN study';
    applogger.trace(bindings, 'Querying "' + query + '"');
    let cursor = await db.query(query, bindings);
    let researchers = await cursor.all();
    
    if (researchers.length) {
      let studyPreferences = researchers[0];
      if (studyPreferences.preferedPatients && studyPreferences.preferedPatients.includes(userKey)) {
        return studyPreferences;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  },  
  
}

export { init, DAL }
