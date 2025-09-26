/**
* This provides the data access for the Study participants.
*/
import * as Types from '../../models/jsdocs.js'

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'participants'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, COLLECTIONNAME)
  collection.ensureIndex({ type: 'persistent', fields: ['userKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['studies[*].studyKey'] })
}

const DAL = {
  /**
   * Gets participants transaction
   * @returns {string}
   */
  participantsTransaction () {
    return COLLECTIONNAME
  },

  /**
   * Saves a new participant
   * @param {!Types.Participant} newparticipant - the new participant to save
   * @returns a Promise
   */
  async createParticipant (newparticipant) {
    const meta = await collection.save(newparticipant)
    newparticipant._key = meta._key
    return newparticipant
  },

  /**
   * Finds one aprticipant by key
   * @param {!string} key - the key of the participant
   * @returns {Promise<Types.Participant>} a promise with the participant if any
   */
  async getOneParticipant (key) {
    const participant = await collection.document(key)
    return participant
  },

  /**
   * Replaces the participant with a new one
   * @param {!string} key - key of the participant
   * @param {!Types.Participant} newParticipant - new participant
   * @param {?string} trx - optional, used for transactions
   * @returns {Promise<Types.Participant>} a promise with the updated participant
   */
  async replaceParticipant (key, newParticipant, trx) {
    newParticipant.updatedTS = new Date()
    let meta
    if (trx) {
      meta = await trx.step(() => collection.replace(key, newParticipant))
    } else {
      meta = await collection.replace(key, newParticipant)
    }
    applogger.trace(newParticipant, 'Replacing participant "' + key + '"')
    newParticipant._key = meta._key
    return newParticipant
  },

  /**
   * Updates partial information of the participant
   * @param {!string} key - key of the participant
   * @param {!Types.Participant} partialParticipant - partial information of the new participant
   * @returns {Promise<Types.Participant>} a promise with the updated participant
   */
  async updateParticipant (key, partialParticipant) {
    const newval = await collection.update(key, partialParticipant, { keepNull: false, mergeObjects: true, returnNew: true })
    applogger.trace(partialParticipant, 'Updating participant "' + key + '"')
    return newval.new
  },

  /**
   * Deletes a participant
   * @param {string} key - key of the participant
   * @param {string} trx - optional, transaction
   * @returns {Promise}
   */
  async removeParticipant (key, trx) {
    if (trx) {
      await trx.step(() => collection.remove(key))
    } else {
      await collection.remove(key)
    }
    applogger.debug('Removing participant "' + key + '"')
    return true
  },

  /**
  * Gets one participant using his/her user key
  * @param {!string} userKey - key of the user of the participant
  * @returns {Promise<Types.Participant>}
  */
  async getParticipantByUserKey (userKey) {
    if (!userKey) {
      throw new Error('user key must be specified')
    }
    const bindings = { userkey: userKey }
    const query = 'FOR participant IN participants FILTER participant.userKey == @userkey RETURN participant'
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    const parts = await cursor.all()
    if (parts.length === 0) return undefined
    else return parts[0]
  },

  /**
   * Gets all the participants in the database
   * @param {?string} currentStatus - optional, status of the participants
   * @param {?string} studykey - optional, participants in a study
   * @param {?number} offset - optional, starting from result N, used for paging
   * @param {?number} count - optional, number of results to be returned, used for paging
   * @param {?Function} dataCallback - optional, callback used when receiving data one by one (except when using pagination)
   * @returns {Promise<Array<Types.Participant> | Types.PagedQueryResult<Types.Participant> | null>} a promise that passes the data as an array, or empty if dataCallback is specified
   */
  async getAllParticipants (currentStatus, studykey, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    const bindings = {}
    let queryOptions = {}

    let queryString = 'FOR participant in participants '
    if (currentStatus) {
      bindings.currentStatus = currentStatus
      queryString += ' FILTER @currentStatus IN participant.studies[*].currentStatus '
    }

    if (studykey) {
      bindings.studykey = studykey
      queryString += `
      FILTER HAS(participant, "studies")
      FOR study in participant.studies
      FILTER @studyKey == study.studyKey
      `
    }


    if (hasPaging) {
      queryString += `LIMIT @offset, @count `
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }
    queryString += ' RETURN participant'

    applogger.trace('Querying "' + queryString + '"')

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
   * Gets all participants by study
   * also accepts status of the participant as optional query parameter
   * @param {!string} studykey - key of the study the participants are involved in
   * @param {?string} currentStatus - optional, status of the participants
   * @param {?number} offset - optional,used for paging
   * @param {?number} count - optional, for paging
   * @param {Function} dataCallback - if we want the participants to be retrieved one by one
   * @returns {Promise<Array<Types.Participant> | Types.PagedQueryResult<Types.Participant> | null>} a promise with the data
   */
  async getParticipantsByStudy (studykey, currentStatus, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    let queryOptions = {}
    let bindings = { studyKey: studykey }

    let query = 'FOR participant IN participants ' +
      ' FILTER HAS(participant, "studies") ' +
      ' FOR study in participant.studies ' +
      ' FILTER @studyKey == study.studyKey '
    if (currentStatus) {
      bindings.currentStatus = currentStatus
      query += ' AND @currentStatus == study.currentStatus  '
    }

    if (hasPaging) {
      query += `LIMIT @offset, @count `
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    query += `LET filteredStudies = participant.studies[* FILTER CURRENT.studyKey == @studyKey]
      LET retval = UNSET(participant, 'studies')`

    query += ' RETURN MERGE_RECURSIVE(retval, { studies: filteredStudies })'

    applogger.trace(bindings, 'Querying "' + query + '"')

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
   * Finds participants related to a given researcher.
   * Studies for each participant are cut to only those where the researcher is involved.
   * @param {!string} researcherUserKey - user key of the researcher
   * @param {?string} currentStatus - optional, filter by status
   * @param {?boolean} filterPreferred - optional, only get preferred participants
   * @param {?string} teamKey - optional, only gets studies for a given team
   * @param {number} offset - used for paging
   * @param {number} count - for paging
   * @param {Function} dataCallback - for retrieving participants one by one
   * @returns {Promise<Array<Types.Participant> | Types.PagedQueryResult<Types.Participant> | null>} a promise with the data
   */
  async getParticipantsByResearcher (researcherUserKey, currentStatus, filterPreferred, teamKey, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    let queryOptions = {}
    const bindings = { researcherKey: researcherUserKey }

    let query = `FOR team IN teams
      FILTER @researcherKey IN team.researchers[*].userKey
      `
    if (teamKey) {
      bindings.teamKey = teamKey
      query += `
      FILTER team._key == @teamKey
      `
    }

    query += `
    LET studiesKeys = (
        FOR study IN studies
        FILTER study.teamKey == team._key
        RETURN study._key
      )
    `


    if (filterPreferred) {
      query += `
      LET preferredParts = FLATTEN(team.researchers[* FILTER CURRENT.userKey == @researcherKey].studiesOptions[** FILTER CURRENT.studyKey IN studiesKeys].preferredParticipantsKeys)
      `
    }

    query += `
      FOR participant IN participants
      FILTER studiesKeys ANY IN participant.studies[*].studyKey
      `
    if (filterPreferred) {
      query += `
      FILTER participant.userKey IN preferredParts
      `
    }

    if (currentStatus) {
      bindings.currentStatus = currentStatus
      query += ' FILTER @currentStatus IN participant.studies[* FILTER CURRENT.studyKey IN studiesKeys].currentStatus \n'
    }

    if (hasPaging) {
      query += `LIMIT @offset, @count \n`
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    if (currentStatus) {
      query += ' LET filteredStudies = participant.studies[* FILTER CURRENT.studyKey IN studiesKeys AND CURRENT.currentStatus == @currentStatus] \n'
    } else {
      query += ` LET filteredStudies = participant.studies[* FILTER CURRENT.studyKey IN studiesKeys] \n`
    }

    query += `
      LET cleanedPart = UNSET(participant, 'studies')
      RETURN MERGE_RECURSIVE(cleanedPart, { studies: filteredStudies }) `

    applogger.trace(bindings, 'Querying "' + query + '"')

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
   * Tells if the researcher and the participant are linked by a common study
   * @param {!string} researcherUserKey - user key of the researcher
   * @param {string} participantUserKey - user key of the participant
   * @param {string} participantKey - key of the participant (in alternative to participantUserKey)
   * @returns {Promise<boolean>} a promise that tells if the participant and the researcher are linked
   */
  async hasResearcherParticipant (researcherUserKey, participantUserKey, participantKey) {
    const bindings = { researcherUserKey }

    let query = `
    FOR team IN teams
      FILTER @researcherUserKey IN team.researchers[*].userKey

      LET studiesKeys = (
        FOR study IN studies
        FILTER study.teamKey == team._key
        RETURN study._key
      )

    FOR participant IN participants
      FILTER studiesKeys ANY IN participant.studies[*].studyKey
    `
    if (participantUserKey) {
      bindings.participantUserKey = participantUserKey
      query += 'FILTER participant.userKey == @participantUserKey'
    } else {
      bindings.participantKey = participantKey
      query += 'FILTER participant._key == @participantKey'
    }

    query += `
    RETURN !!participant
    `
    applogger.trace(bindings, 'Querying "' + query + '"')

    const cursor = await db.query(query, bindings)
    const retVal = await cursor.all()
    return !!retVal[0]
  },

  /**
   * Gets all participants in a team
   * @param {!string} teamKey - key of the team
   * @param {?string} studyKey - optional, studyKey
   * @param {?string} currentStatus - optional, status
   * @param {number} offset - used for paging
   * @param {number} count - for paging
   * @param {Function} dataCallback - for retrieving participants one by one
   * @returns
   */
  async getParticipantsByTeam (teamKey, studyKey, currentStatus, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    let queryOptions = {}
    const bindings = { teamKey: teamKey }

    let query = ''
    if (studyKey) {
      bindings.studyKey = studyKey
      query += `
        LET studiesKeys = (FOR study IN studies FILTER (study.teamKey == @teamKey AND study._key == @studyKey) RETURN study._key)
      `
    } else {
      query += `
        LET studiesKeys = (FOR study IN studies FILTER study.teamKey == @teamKey RETURN study._key)
      `
    }

    query += `
    FOR participant IN participants
      FILTER participant.studies[*].studyKey ANY IN studiesKeys
    `

    if (currentStatus) {
      bindings.currentStatus = currentStatus
      query += `
      AND @currentStatus IN participant.studies[*].currentStatus
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

    query += 'RETURN  participant'

    applogger.trace(bindings, 'Querying "' + query + '"')

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

}

export { init, DAL }

