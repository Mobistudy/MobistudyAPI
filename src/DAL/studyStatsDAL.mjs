/**
 * This provides statistics about the studies.
 */
import { Console } from 'console'
import { applogger } from '../services/logger.mjs'

let db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
}

const DAL = {

  /**
   * Provides number of participants per status in a study
   * @param {string} studykey - key of the study
   * @returns {Promise}
   */
  async getParticipantsStatusCountByStudy (studykey) {
    const bindings = { studyKey: studykey }
    const query = `FOR participant IN participants
      FILTER @studyKey IN participant.studies[*].studyKey
      COLLECT statuses = participant.studies[* FILTER CURRENT.studyKey == @studyKey].currentStatus WITH COUNT INTO statuesLen
      RETURN { status: FIRST(statuses), count: statuesLen }`
    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings)
    return cursor.all()
  },

  /**
   * Gets a summary of the last task executed by each patient in a study
   * @param {string} studyKey - mandatory, the key of the study for which the statistics are retrieved
   * @param {string} participantName - optional, to filter by name, or surname
   * @param {string} statusType - optional, to filer by status in the study,
   * being 'accepted', 'withdrawn', 'completed', 'excluded', 'rejected'
   * @param {object} preferredParticipants - optional, an object carrying 2 properties:
   * include: 'none' does not include preferred participants, 'both' includes preferred and not, 'only' includes only preferred
   * researcherKey: user key of the researcher
   * @param {integer} offset - optional, used for paging. If used also count must be present and the returned value is different
   * @param {integer} count - optional, used for paging.
   * If used also`offset` must be present and the returned value is different
   * @param {function} dataCallback - optional used for retrieving elements one by one
   * @returns a Promise with the data (if dataCallback is not specified).
   * The data is either the array for each participant, or, if paging is specified (and no callback used),
   * it's an object containing the total count (including filters) in `totalCount` and the paged data in `subset`
   */
  async getLastTasksSummary (studyKey, participantName, statusType, preferredParticipants, offset, count, dataCallback) {

    const queryOptions = {}
    const bindings = {
      studyKey
    }

    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    let queryString = ''
    queryString += `
      FOR p IN participants
      FILTER HAS( p, "studies")
      FOR s IN p.studies
        FILTER s.studyKey == @studyKey `
    if (statusType) {
      queryString += `&& s.currentStatus == @statusType `
      bindings.statusType = statusType
    }
    let includePreferredParts = preferredParticipants && preferredParticipants.include !== 'none'
    // 'none' does not include preferred participants, 'both' includes preferred and not, 'only' includes only preferred
    if (includePreferredParts) {
      bindings.researcherKey = preferredParticipants.researcherKey
      queryString += `
            FOR st in studies
              FILTER st._key == @studyKey
            FOR te in teams
              FILTER te._key == st.teamKey
            FOR re in te.researchers
              FILTER re.userKey == @researcherKey
            LET isPref = p.userKey IN FLATTEN(re.studiesOptions[* FILTER CURRENT.studyKey == @studyKey].preferredParticipantsKeys)
      `
      if (preferredParticipants.include === 'only') {
        queryString += `FILTER isPref == true`
      }
    }
    if (participantName) {
      bindings.partname = participantName
      queryString += `FILTER LIKE(p.name, CONCAT('%', @partname, '%'), true) OR  LIKE(p.surname, CONCAT('%', @partname, '%'), true)`
    }
    queryString += `
      LET user = (FOR user IN users FILTER p.userKey == user._key RETURN user)[0]
      LET taskResultCount = LENGTH(FOR task IN tasksResults FILTER p.userKey == task.userKey && @studyKey == task.studyKey RETURN task)
      LET lastTask = FIRST(
        FOR t IN tasksResults
        FILTER t.studyKey == @studyKey
        FILTER t.userKey == p.userKey
        SORT t.createdTS DESC
        LIMIT 1
        RETURN {createdTS : t.createdTS, taskType: t.taskType }
      )`

    if (hasPaging) {
      queryString += `LIMIT @offset, @count `
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    queryString += `RETURN {
      userKey: p.userKey,
      name: p.name,
      surname: p.surname,
      DOB: p.dateOfBirth,
      userEmail: user.email,
      acceptedTS: s.acceptedTS,
      status: FIRST(p.studies[* FILTER CURRENT.studyKey == @studyKey].currentStatus),
      taskResultCount: taskResultCount,
      lastTaskDate: lastTask.createdTS,
      lastTaskType: lastTask.taskType`
    if (includePreferredParts) {
      queryString += `,
      isPreferred: isPref
      `
    }
    queryString += `}`

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
  }
}

export { init, DAL }
