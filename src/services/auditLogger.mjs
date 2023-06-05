/**
* Audit log, uses the DB to log events.
*/
import { DAL } from '../DAL/DAL.mjs'

export default {
  /**
   * Log an event on the audit log
   * @param {*} event: event name
   * @param {*} userKey: identifier of the user
   * @param {*} studyKey: identifier of the study
   * @param {*} taskId: identifier of the task
   * @param {*} message: textual description of what is happening
   * @param {*} refData: name of the data that has been affected (if any)
   * @param {*} refKey: key of the data that has been affected (if any)
   */
  async log (event, userKey, studyKey, taskId, message, refData, refKey, data) {
    DAL.addAuditLog({
      timestamp: new Date(),
      event,
      userKey,
      studyKey,
      taskId,
      message,
      refData,
      refKey
    })
  }
}
