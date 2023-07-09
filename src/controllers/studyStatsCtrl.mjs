/**
 * This provides the API endpoints for the study statistics.
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
   * Get a summary of the last tasks performed by participants in a study.
   * mandatory query param: studyKey to filter by study
   * optional query params: participantName, statusType, offset, count
   * @param {object} req: express request object
   * @param {object} res: express response object
   * @returns a promise
   */
  async getLastTasksSummary (req, res) {
    if (!req.query || !req.query.studyKey) {
      const errmess = 'Cannot request study statistics without specifying a study'
      applogger.warn(errmess)
      return res.status(400).send(errmess)
    }
    const studyKey = req.query.studyKey

    try {
      const study = await DAL.getOneStudy(studyKey)
      if (!study) return res.sendStatus(404)

      if (req.user.role === 'researcher') {
        const team = await DAL.getAllTeams(req.user._key, studyKey)
        if (team.length === 0) {
          const errmess = 'Researcher cannot request study statistics for a study (s)he is not involved in'
          applogger.warn(errmess)
          return res.status(403).send(errmess)
        }
      } else if (req.user.role === 'participant') {
        const errmess = 'Participants cannot see study statistics'
        applogger.warn(errmess)
        return res.status(403).send(errmess)
      }
      let participants = []
      participants = await DAL.getLastTasksSummary(
        req.query.studyKey,
        req.query.participantName,
        req.query.statusType,
        req.query.offset,
        req.query.count
      )
      res.json(participants)
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot retrieve tasks results')
      res.sendStatus(500)
    }
  }
}
