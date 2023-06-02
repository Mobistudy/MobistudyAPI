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
  async getLastTasksSummary (studyKey, participantName, statusType,  dataCallback) {

    const bindings = {
      studyKey,
      statusType
    }

    let queryString = `
    FOR p IN participants
      FOR s IN p.studies
        FILTER s.studyKey == @studyKey `
    if (statusType){
      queryString += `&& s.currentStatus == @statusType `
    }
    if (participantName){
      const fullname = participantName.split(" ")
      if(fullname[1]){
        queryString += `FILTER LIKE(p.name, CONCAT('%', '${fullname[0]}', '%'), true) `
        queryString += `FILTER LIKE(p.surname, CONCAT('%','${fullname[1]}', '%'), true) `
      }else{
        queryString += `FILTER LIKE(p.name, CONCAT('%', '${fullname[0]}', '%'), true) `
      }
    }
    queryString += `LET user = (FOR user IN users FILTER p.userKey == user._key RETURN user)[0]
    LET taskResultCount = LENGTH(FOR task IN tasksResults FILTER p.userKey == task.userKey && @studyKey == task.studyKey RETURN task)
    LET lastTask = FIRST(
      FOR t IN tasksResults
      FILTER t.studyKey == @studyKey
      FILTER t.userKey == p.userKey
      SORT t.createdTS DESC
      LIMIT 1
      RETURN {createdTS : t.createdTS, taskType: t.taskType }
    )
    RETURN {
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
