/**
 * Controller for the API endpoint to retrieve audit log information
 */
import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'

export default {
  /**
   * Initialises the controller.
   */
  async init () {
  },

  async getEventTypes (req, res) {
    if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
      res.sendStatus(403)
    } else {
      try {
        const result = await DAL.getLogEventTypes(req.query)
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve audit log')
        res.sendStatus(500)
      }
    }
  },

  // query parameters (optional):
  // after: ISO timeStamp
  // before: ISO timeStamp
  // eventType: type of event
  // studyKey
  // taskId
  // userEmail
  // sortDirection: ASC or DESC
  // offset: for pagination
  // rowsPerPage: for pagination
  async getAuditLogs (req, res) {
    if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
      console.log('not a researcher')
      res.sendStatus(403)
    } else {
      try {
        // Researcher: a study must be specified and the researcher has to be allowed to see that study
        if (req.user.role === 'researcher') {
          if (!req.query.studyKey) return res.sendStatus(400)
          const teams = await DAL.getAllTeams(req.user._key, req.query.studyKey)
          if (teams.length === 0) return res.sendStatus(403)
        }
        const result = await DAL.getAuditLogs(
          req.query.after,
          req.query.before,
          req.query.eventType,
          req.query.studyKey,
          req.query.taskId,
          req.query.userEmail,
          req.query.sortDirection,
          req.query.offset,
          req.query.count
        )
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve audit log')
        res.sendStatus(500)
      }
    }
  }
}
