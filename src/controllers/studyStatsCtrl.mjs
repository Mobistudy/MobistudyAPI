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
   * Provides simple statistics about how many participants are in each status
   * @param {Object} req - express request, must include param: studyKey
   * @param {Object} res - express response
   * @returns
   */
  async getParticipantsStatusCounts (req, res) {
    try {
      if (req.user.role === 'participant') {
        res.sendStatus(403)
      } else if (req.user.role === 'researcher') {
        if (req.user.role === 'researcher') {
          const team = await DAL.getAllTeams(
            req.user._key,
            req.params.studyKey
          )
          if (team.length === 0) return res.sendStatus(403)
        }
        const participants = await DAL.getParticipantsStatusCountByStudy(
          req.params.studyKey
        )
        res.json(participants)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve participants')
      res.sendStatus(500)
    }
  },

  /**
   * Get a summary of the last tasks performed by participants in a study.
   * mandatory url param: studyKey to filter by study
   * optional query params: participantName, statusType, includePreferredParticipants ('none', 'both', 'only'), offset, count
   * @param {object} req: express request object
   * @param {object} res: express response object
   * @returns a promise
   */
  async getLastTasksSummary (req, res) {
    if (!req.params.studyKey) {
      const errmess = 'Cannot request study statistics without specifying a study'
      applogger.warn(errmess)
      return res.status(400).send(errmess)
    }
    const studyKey = req.params.studyKey

    try {
      const study = await DAL.getStudyByKey(studyKey)
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
      let preferredParts = undefined
      if (req.query.includePreferredParticipants) {
        preferredParts = {
          include: req.query.includePreferredParticipants,
          researcherKey: req.user._key
        }
      }
      participants = await DAL.getLastTasksSummary(
        studyKey,
        req.query.participantName,
        req.query.statusType,
        preferredParts,
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
