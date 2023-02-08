/**
 * This provides statistics about the studies.
 */
import { applogger } from '../services/logger.mjs'

let db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
}

const DAL = {

  getLastTasksSummary: async function (studyKey, dataCallback) {
    let queryString = `FOR p IN participants
    FILTER @studyKey IN p.studies[*].studyKey
    LET lastTask = FIRST(
      FOR t IN tasksResults
      FILTER t.studyKey == @studyKey
      FILTER t.userKey == p.userKey
      SORT t.createdTS DESC
      LIMIT 1
      RETURN {createdTS : t.createdTS, taskType: t.taskType }
    )
    RETURN { userKey: p.userKey, name: p.name, surname: p.surname, DOB: p.dateOfBirth, status: FIRST(p.studies[* FILTER CURRENT.studyKey == @studyKey].currentStatus), lastTaskDate: lastTask.createdTS, lastTaskType: lastTask.taskType }`

    const bindings = {
      studyKey
    }

    applogger.trace(bindings, 'Querying "' + queryString + '"')
    const cursor = await db.query(queryString, bindings)

    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else return cursor.all()
  }
}

export { init, DAL }
