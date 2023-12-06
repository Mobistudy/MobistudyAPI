import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'researchers'

let collection, db

const init = async function (DB) {
    db = DB
    collection = await utils.getCollection(db, COLLECTIONNAME)
    collection.ensureIndex({ type: 'persistent', fields: ['userKey'] })
    collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
  }

  const DAL = {

    addPreferedPatient: async function (userKey, studyKey) {
        const meta = await collection.save(userKey)
        newuser._key = meta._key
        return newpreferedpatient
      },

      async getStudyPreferences (studyKey) {
        let bindings = { 'key': studyKey }
        var query = 'FOR study in researchers FILTER study._key == @key RETURN study'
        applogger.trace(bindings, 'Querying "' + query + '"')
        let cursor = await db.query(query, bindings)
        let researchers = await cursor.all()
        if (researchers.length) return researchers[0]
        else return undefined
      },

    //   async replaceTeam (_key, team) {
    //     let meta = await collection.replace(_key, team)
    //     team._key = meta._key
    //     return team
    //   },

    // studyKey: <keyOfTheStudy>
    // preferedPatients: [<userId>, <userId>...]
    }

    export { init, DAL }
