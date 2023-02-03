/**
 * This provides the API endpoints for the study statistics.
 */
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { DAO } from '../DAO/DAO.mjs'

export default {
  /**
   * Initialises the controller.
   */
  async init () {
  },

  /**
   * Get a summary of the last tasks performed by participants in a study.
   * mandatory query param: studyKey to filter by study
   * @param {object} req: express request object
   * @param {object} res: express response object
   * @returns a promise
   */
  async getLastTasksSummary (req, res) {
    const studyKey = req.params.study_key
    if (!studyKey) {
      const errmess = 'Cannot request study statistics without specifying a study'
      applogger.warn(errmess)
      return res.status(400).send(errmess)
    }

    try {
      if (req.user.role === 'researcher') {
        const team = await DAO.getAllTeams(req.user._key, studyKey)
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

      const resultsData = await DAO.getLastTasksSummary(studyKey)
      res.send(resultsData)
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot retrieve tasks results')
      res.sendStatus(500)
    }
  },

  /**
   * Creates new tasks results. The new results are passed in the body.
   * Any data inside the property "data" is saved on file and removed from the object
   * before being saved on the database.
   * @param {object} req: express request object, the new object must be in the body
   * @param {object} res: express response object
   * @returns a promise
   */
  async createNew (req, res) {
    let trans

    try {
      let newTasksResults = req.body
      if (req.user.role !== 'participant') return res.sendStatus(403)

      const valid = this.validate(newTasksResults)
      if (!valid) {
        applogger.error({ errors: this.validate.errors }, 'Tasks results does not validate against schema')
        return res.status(400).send('tasks results does not validate against schema')
      }
      newTasksResults.userKey = req.user._key
      if (!newTasksResults.createdTS) newTasksResults.createdTS = new Date()

      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) {
        const errmess = 'Tasks results sent for a non existing participant'
        applogger.warn(errmess)
        return res.status(400).send(errmess)
      }
      if (!participant.studies) {
        const errmess = 'Tasks results sent for a participant with no studies'
        applogger.warn(errmess)
        return res.status(400).send(errmess)
      }

      const study = participant.studies.find((s) => {
        return s.studyKey === newTasksResults.studyKey
      })
      if (!study) {
        const errmess = 'Tasks results sent for a participant with no study with key ' + newTasksResults.studyKey
        applogger.warn(errmess)
        return res.status(400).send(errmess)
      }

      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newTasksResults.taskId)
      if (!taskItem) {
        const errmess = 'Tasks results sent for a participant with no task with id ' + newTasksResults.taskId
        applogger.warn(errmess)
        return res.status(400).send(errmess)
      }

      trans = await DAO.startTransaction([DAO.tasksResultsTransaction(), DAO.participantsTransaction()])

      // store the database data
      newTasksResults = await DAO.createTasksResults(newTasksResults, trans)

      if (newTasksResults.data) {
        // separate data from the object stored on the database
        const resultsData = newTasksResults.data
        delete newTasksResults.data

        // save the attachment
        const filename = newTasksResults._key + '.json'
        const writer = await getAttachmentWriter(newTasksResults.userKey, newTasksResults.studyKey, newTasksResults.taskId, filename)
        await writer.write(JSON.stringify(resultsData))
        await writer.end()

        // save the filename
        newTasksResults.attachments = [filename]
        newTasksResults = await DAO.replaceTasksResults(newTasksResults._key, newTasksResults, trans)
      }

      // also update task status
      taskItem.lastExecuted = newTasksResults.createdTS
      await DAO.replaceParticipant(participant._key, participant, trans)

      DAO.endTransaction(trans)

      res.status(200).send({
        _key: newTasksResults._key
      })
      applogger.info({ userKey: req.user._key, taskId: newTasksResults.taskId, studyKey: newTasksResults.studyKey }, 'Participant has sent tasks results for task ' + newTasksResults.type)
      auditLogger.log('tasksResultsCreated', req.user._key, newTasksResults.studyKey, newTasksResults.taskId, 'Results received for ' + newTasksResults.type + ' task, task id ' + newTasksResults.taskId + ', by participant ' + participant._key + ' for study ' + newTasksResults.studyKey, 'tasksResults', newTasksResults._key, newTasksResults)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new tasks results')
      res.sendStatus(500)
      if (trans) DAO.abortTransaction(trans)
    }
  }
}
