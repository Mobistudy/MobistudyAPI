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
   * Gets a summary of the last task executed by each patient in a study
   * @param {string} studyKey mandatory, the key of the study for which the statistics are retrieved
   * @param {string} participantName optional, to filter by name, or surname
   * @param {string} statusType optional, to filer by status in the study,
   * being 'accepted', 'withdrawn', 'completed', 'excluded', 'rejected'
   * @param {integer} offset optional, used for paging. If used also count must be present and the returned value is different
   * @param {integer} count optional, used for paging.
   * If used also`offset` must be present and the returned value is different
   * @param {function} dataCallback optional used for retrieving elements one by one
   * @returns a Promise with the data (if dataCallback is not specified).
   * The data is either the array for each participant, or, if paging is specified (and no callback used),
   * it's an object containing the total count (including filters) in `totalCount` and the paged data in `subset`
   */
  async getLastTasksSummary (studyKey, participantName, statusType, offset, count, dataCallback) {

    const queryOptions = {}
    const bindings = {
      studyKey,
      statusType
    }

    let queryString = ''
    queryString += `
      FOR p IN participants
      FILTER HAS( p, "studies")
      FOR s IN p.studies
        FILTER s.studyKey == @studyKey `
    if (statusType) {
      queryString += `&& s.currentStatus == @statusType `
    }
    if (participantName) {
      bindings.partname = names[0]
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

    if (!!offset && !!count) {
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
      status: FIRST(p.studies[* FILTER CURRENT.studyKey == @studyKey].currentStatus),
      taskResultCount: taskResultCount,
      lastTaskDate: lastTask.createdTS,
      lastTaskType: lastTask.taskType
      }`

    applogger.trace(bindings, 'Querying "' + queryString + '"')

    const cursor = await db.query(queryString, bindings, queryOptions)

    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else {
      if (!!offset && !!count) {
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
