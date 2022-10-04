/**
 * This provides the API endpoints for all tasks results.
 */
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { getAttachmentWriter } from '../services/attachments.mjs'
import { readFile } from 'fs/promises'
import Ajv from 'ajv'

export default {
  /**
   * Json schema validate function
   */
  validate: null,

  /**
   * Initialises the controller.
   */
  async init () {
    const tasksResultsSchema = JSON.parse(
      await readFile('./models/taskResults.json')
    )
    const answersSummarySchema = JSON.parse(
      await readFile('./models/answersSummary.json')
    )
    const answersDataSchema = JSON.parse(
      await readFile('./models/answersData.json')
    )
    const fingerTappingSummarySchema = JSON.parse(
      await readFile('./models/fingerTappingSummary.json')
    )
    const fingerTappingDataSchema = JSON.parse(
      await readFile('./models/fingerTappingData.json')
    )

    const holdPhoneSummarySchema = JSON.parse(
      await readFile('./models/holdPhoneSummary.json')
    )
    const holdPhoneDataSchema = JSON.parse(
      await readFile('./models/holdPhoneData.json')
    )

    const tugtSummarySchema = JSON.parse(
      await readFile('./models/tugtSummary.json')
    )
    const tugtDataSchema = JSON.parse(
      await readFile('./models/tugtData.json')
    )

    const vocalizaitonSummarySchema = JSON.parse(
      await readFile('./models/vocalizationSummary.json')
    )

    const ajv = new Ajv({
      schemas: [
        tasksResultsSchema,
        answersSummarySchema,
        answersDataSchema,
        fingerTappingSummarySchema,
        fingerTappingDataSchema,
        holdPhoneSummarySchema,
        holdPhoneDataSchema,
        tugtSummarySchema,
        tugtDataSchema,
        vocalizaitonSummarySchema
      ],
      allowUnionTypes: true
    })

    this.validate = ajv.getSchema('https://mobistudy.org/models/tasksResults.json')
  },

  /**
   * Get all tasks results
   * optional query param: studyKey to filter by study
   * @param {object} req: express request object
   * @param {object} res: express response object
   * @returns a promise
   */
  async getAll (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // researcher requests tasks results
        if (!req.query.studyKey) {
          const errmess = 'Researcher cannot request tasks results without specifying a study'
          applogger.warn(errmess)
          return res.status(400).send(errmess)
        }
        const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
        if (team.length === 0) {
          const errmess = 'Researcher cannot request tasks results for a study (s)he is not involved in'
          applogger.warn(errmess)
          return res.status(403).send(errmess)
        } else {
          const resultsData = await DAO.getTasksResultsByStudy(req.query.studyKey)
          res.send(resultsData)
        }
      } else if (req.user.role === 'participant') {
        // participant requests tasks results
        let resultsData
        if (req.query && req.query.studyKey) {
          // results for a given study
          resultsData = await DAO.getTasksResultsByUserAndStudy(req.user._key, req.query.studyKey)
        } else {
          // results for all studies
          resultsData = await DAO.getTasksResultsByUser(req.user._key)
        }
        res.send(resultsData)
      } else {
        // admin
        const resultsData = await DAO.getAllTasksResults()
        res.status(200).send(resultsData)
      }
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
