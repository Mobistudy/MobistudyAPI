/**
 * This provides the API endpoints for the attachments.
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
   * Get a single attachment. StudyKey, userKey, taskId and filename must be passed as URL params.
   * @param {object} req: express request object
   * @param {object} res: express response object
   * @returns a promise
   */
  async getAttachment (req, res) {
    if (!req.params || !req.params.studyKey) {
      const errmess = 'Cannot request attachment without specifying a study'
      applogger.warn(errmess)
      return res.status(400).send(errmess)
    }
    const studyKey = req.params.studyKey

    if (!req.params || !req.params.userkey) {
      const errmess = 'Cannot request attachment without specifying a user key'
      applogger.warn(errmess)
      return res.status(400).send(errmess)
    }
    let userkey = req.params.userkey

    if (!req.params || !req.params.taskId) {
      const errmess = 'Cannot request attachment without specifying a taskId'
      applogger.warn(errmess)
      return res.status(400).send(errmess)
    }
    const taskId = req.params.taskId

    if (!req.params || !req.params.fileName) {
      const errmess = 'Cannot request attachment without specifying a fileName'
      applogger.warn(errmess)
      return res.status(400).send(errmess)
    }
    const fileName = req.params.fileName

    try {
      // verify if study exists
      const study = await DAL.getOneStudy(studyKey)
      if (!study) return res.sendStatus(404)

      if (req.user.role === 'researcher') {
        // verify that researcher can access the study
        const team = await DAL.getAllTeams(req.user._key, studyKey)
        if (team.length === 0) {
          const errmess = 'Researcher cannot request attachments for a study (s)he is not involved in'
          applogger.warn(errmess)
          return res.status(403).send(errmess)
        }
      } else if (req.user.role === 'participant') {
        // participants can only access their own data, just ignore any userKey in the URL and use login key instead
        userkey = req.user._key
      }

      // TODO: get the reader
      let readStream = null

      // attach it to pipe of response
      readStream.pipe(res)
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot read attachment')
      res.sendStatus(500)
    }
  }
}
