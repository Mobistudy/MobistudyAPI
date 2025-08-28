/**
 * This provides the data access for the study descriptions.
 */
import * as Types from '../../models/jsdocs.js'
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

let collection, db

const COLLECTIONNAME = 'studies'

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, COLLECTIONNAME)
  collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
}

const DAL = {
  /**
 * Gets transaction for studies
 * @returns {string} the transaction name
 */
  studiesTransaction () {
    return COLLECTIONNAME
  },

  /**
   * Creates a new study
   * @param {Types.StudyDescription} newstudy - study to be created
   * @returns {Promise<Array<Types.StudyDescription>}  a Promise that passes the study just created, with its key
   */
  async createStudy (newstudy) {
    const meta = await collection.save(newstudy)
    newstudy._key = meta._key
    return newstudy
  },

  /**
   * Retrieves one study, by Key
   * @param {Object} studyKey
   * @returns {Promise<Array<Types.StudyDescription>} a Promise passing the study
   */
  async getStudyByKey (studyKey) {
    applogger.trace('Searching for study ' + studyKey)
    return collection.document(studyKey, { graceful: true })
  },

  /**
   * Gets the studies
   * @param {*} after - optional, only studies after a certain date TODO: implement filter
   * @param {*} before - optional, only studies before a certain date TODO: implement filter
   * @param {*} studyTitle - optional, name of the study TODO: implement filter
   * @param {*} teamsKeys - optional, filter by certain teams
   * @param {*} participantKey - optional, filter by participant key
   * @param {*} summary - optional, returns a summary of the studies
   * @param {*} sortDirection - optional, sort direction referring to the creation time
   * @param {*} offset - optional, starting from result N, used for paging
   * @param {*} count - optional, number of results to be returned, used for paging
   * @param {*} dataCallback - optional, callback used when receiving data one by one (except when using pagination)
   * @returns {Promise<Array<Types.StudyDescription> | Types.PagedQueryResult<Types.StudyDescription> | null>}  a promise that passes the data as an array (or empty if dataCallback is specified)
   */
  async getStudies (after, before, studyTitle, teamsKeys, participantKey, summary, sortDirection, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    const bindings = {}
    let queryOptions = {}
    let queryString = 'FOR study IN studies '

    if (participantKey) {
      queryString += `
      FOR participant IN participants
      FILTER participant._key == @participantKey
      FILTER study._key IN participant.studies[*].studyKey
      `
      bindings.participantKey = participantKey
    }

    if (teamsKeys && teamsKeys.length > 0) {
      // from ArangoQL documentation: https://www.arangodb.com/docs/stable/aql/operations-filter.html
      // POSITION(anyArray, search, returnIndex) → position Return whether search is contained in array.

      queryString += 'FILTER POSITION( @teamsKeys, study.teamKey ) '
      bindings.teamsKeys = teamsKeys
    }

    if (!sortDirection) {
      sortDirection = 'DESC'
    }
    queryString += 'SORT study.createdTS @sortDirection '
    bindings.sortDirection = sortDirection

    if (hasPaging) {
      queryString += `LIMIT @offset, @count `
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    if (!!offset && !!count) {
      queryString += 'LIMIT @offset, @count '
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
    }

    if (summary) {
      console.log('SUMMARY')
      queryString += ` RETURN {
      _key: study._key,
      title: study.generalities.title,
      createdTS: study.createdTS,
      publishedTS: study.publishedTS,
      startDate: study.generalities.startDate,
      endDate: study.generalities.endDate,
      }
      `
    } else {
      queryString += ` RETURN study`
    }

    applogger.trace(bindings, 'Querying "' + queryString + '"')
    const cursor = await db.query(queryString, bindings, queryOptions)
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
   * Gets all the studies belonging to a team
   * @param {string} teamkey - key of the team
   * @returns {Promise<Array<Types.StudyDescription>}  a promise that passes the data as an array
   */
  async getAllTeamStudies (teamkey) {
    const query = 'FOR study in studies FILTER study.teamKey == @teamkey RETURN study'
    const bindings = { teamkey: teamkey }
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    return cursor.all()
  },

  /**
 * Gets all the studies belonging to a participant
 * @param {string} participantKey - key of the participant
 * @returns {Promise<Array<Types.StudyDescription>}  a promise that passes the data as an array
 */
  async getAllParticipantStudies (participantKey) {
    const query = `FOR participant IN participants
      FILTER participant._key == @participantKey
      FOR study IN studies
      FILTER study._key IN participant.studies[*].studyKey
      RETURN study`
    const bindings = { participantKey: participantKey }
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    return cursor.all()
  },

  /**
  * Replaces a study, we assume the _key is the correct one
  * @param {string} _key - key of the study to be replaced
  * @param {Types.StudyDescription} study - new study desctiption
  * @returns {Promise<Types.StudyDescription>}  a promise that passes the new study description
  */
  async replaceStudy (_key, study) {
    const meta = await collection.replace(_key, study)
    study._key = meta._key
    return study
  },

  /**
  * Updates a study, we assume the _key is the correct one
  * @param {string} _key - key of the study to be replaced
  * @param {Types.StudyDescription} study - new study desctiption
  * @returns {Promise<Types.StudyDescription>}  a promise that passes the new study description
  */
  async updateStudy (_key, study) {
    const newval = await collection.update(_key, study, {
      keepNull: false,
      mergeObjects: true,
      returnNew: true
    })
    return newval
  },

  /**
  * Deletes a study, also removes all received task results and information about the study from participants
  * @param {String} _key - key of the study to be replaced
  * @returns {Promise}  a promise that passes true if all OK
  */
  async deleteStudy (_key) {
    await collection.remove(_key)
    return true
  },

  /**
   * Creates an unused invitation code
   * @returns {Promise<String>}  a Promise, passing the code
   */
  async getNewInvitationCode () {
    let repeat = true
    let invitationCode
    do {
      // generate a random 6 digits number
      invitationCode = ('' + Math.round(Math.random() * 999999)).padStart(6, '0')
      // check if the number is already used
      const query = 'FOR study IN studies FILTER study.invitationCode == @invitationCode RETURN study'
      const bindings = { invitationCode: invitationCode }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      const study = await cursor.all()
      if (study.length) repeat = true
      else repeat = false
    } while (repeat)
    applogger.info({ invitationCode: invitationCode }, 'Invitation code generated:')
    return invitationCode + ''
  },

  /**
   * Gets the one study that matches the invitation code
   * @param {String} invitationCode
   * @returns {Promise<Types.StudyDescription>} a Promise passing the study description
   */
  async getInvitationalStudy (invitationCode) {
    const query = 'FOR study IN studies FILTER study.invitationCode == @invitationCode RETURN study'
    const bindings = { invitationCode: invitationCode }
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    const study = await cursor.next()
    return study
  },


  /**
   * Gets all the studies that match inclusion criteria
   * @param {String} userKey - key of the user to match studies against
   * @returns {Promise<Array<Types.StudyDescription>}  a promise that passes the data as an array
   */
  async getMatchedNewStudies (userKey) {
    // TODO add BMI to query
    const query = `FOR study IN studies
      FILTER !!study.publishedTS
      LET partsN = FIRST (
        RETURN COUNT(
          FOR part IN participants
          FILTER !!part.studies
          FILTER study._key IN part.studies[* FILTER !!CURRENT.acceptedTS].studyKey
          RETURN 1
        )
      )
      FILTER !study.numberOfParticipants || study.numberOfParticipants > partsN
      FOR participant IN participants
      LET age = DATE_DIFF(participant.dateOfBirth, DATE_NOW(), "year")
      FILTER participant.userKey == @userKey
      AND study._key NOT IN participant.studies[*].studyKey
      AND participant.language IN study.generalities.languages[*]
      AND participant.country IN study.inclusionCriteria.countries[*]
      AND age >= study.inclusionCriteria.minAge AND age <= study.inclusionCriteria.maxAge
      AND participant.sex IN study.inclusionCriteria.sex
      AND participant.studiesSuggestions == TRUE
      AND study.inclusionCriteria.diseases[*].conceptId ALL IN participant.diseases[*].conceptId
      AND study.inclusionCriteria.medications[*].conceptId ALL IN participant.medications[*].conceptId
      AND !study.invitational
      RETURN study._key`

    const bindings = { userKey: userKey }
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    return cursor.all()
  }
}
export { init, DAL }
