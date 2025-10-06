/**
 * This provides the API endpoints for all tasks results.
 */
import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'

export default {
  /**
   * Initialises the controller.
   */
  async init () {
  },

  /**
   * Provides task results indicators for a given study, task id and user.
   * @param {Object} req - express request, must include param: studyKey, userKey, optional as query: taskIds (comma separated), producer, offset, count
   * @param {Object} res - express response
   * @returns
   */
  async getTaskResultsIndicators (req, res) {
    try {
      if (req.user.role === 'participant') {
        res.sendStatus(403)
      } else if (req.user.role === 'researcher') {
        const { studyKey, userKey } = req.params
        if (!studyKey || !userKey) {
          return res.status(400).send('Missing required parameters: studyKey, userKey')
        }

        if (req.user.role === 'researcher') {
          const team = await DAL.getAllTeams(
            req.user._key,
            req.params.studyKey
          )
          if (team.length === 0) return res.sendStatus(403)
        }

        const { taskIds, producer, date } = req.query
        let offset, count
        if (req.query.offset) offset = parseInt(req.query.offset)
        if (req.query.count) count = parseInt(req.query.count)

        let taskIdsArray = null
        if (taskIds) {
          taskIdsArray = taskIds.split(',')
          if (taskIdsArray.length === 0) {
            return res.status(400).send('If provided, taskIds must be a non-empty comma separated list of task ids')
          }
        }

        let indicators = await DAL.getAllTaskIndicators(studyKey, userKey, producer, taskIdsArray, date ? new Date(date) : null, offset, count, null)
        return res.status(200).json(indicators)
      }
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot retrieve participants')
      res.sendStatus(500)
    }
  }
}
