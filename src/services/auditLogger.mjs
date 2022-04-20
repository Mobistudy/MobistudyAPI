/**
* Audit log, uses the DB to log events.
*/
import { DAO } from '../DAO/DAO.mjs'

export default {
  /**
   *
   * @param {*} event: event name
   * @param {*} userKey: identifier of the user
   * @param {*} studyKey: identifier of the study
   * @param {*} taskId: identifier of the task
   * @param {*} message: textual description of what is happening
   * @param {*} refData: name of the data that has been affected (if any)
   * @param {*} refKey: key of the data that has been affected (if any)
   * @param {*} data: actual data affected
   */
  async log (event, userKey, studyKey, taskId, message, refData, refKey, data) {
    DAO.addAuditLog({
      timestamp: new Date(),
      event,
      userKey,
      studyKey,
      taskId,
      message,
      refData,
      refKey,
      data
    })
  }
}
