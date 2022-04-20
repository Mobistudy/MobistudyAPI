/**
 * This provides the API endpoints for all tasks results.
 */
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'
import { readFile } from 'fs/promises'
import Ajv from 'ajv'

export default {
  validate: null,

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

    const ajv = new Ajv({
      schemas: [
        tasksResultsSchema,
        answersSummarySchema,
        answersDataSchema,
        fingerTappingSummarySchema,
        fingerTappingDataSchema
      ],
      allowUnionTypes: true
    })

    this.validate = ajv.getSchema('https://mobistudy.org/models/tasksResults.json')
  },
  // Get all tasks results
  // optional query param for researcher: studyKey to filter by study
  async getAll (req, res) {
    try {
      if (req.user.role === 'researcher') {
        const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
        if (team.length === 0) return res.sendStatus(403)
        else {
          const resultsData = await DAO.getTasksResultsByStudy(req.query.studyKey)
          res.send(resultsData)
        }
      } else if (req.user.role === 'participant') {
        const resultsData = await DAO.getTasksResultsByUser(req.user._key)
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

  async createNew (req, res) {
    let newTasksResults = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    const valid = this.validate(newTasksResults)
    if (!valid) {
      console.error('tasks results does not validate against schema', this.validate.errors)
      return res.sendStatus(400)
    }
    newTasksResults.userKey = req.user._key
    if (!newTasksResults.createdTS) newTasksResults.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      if (!participant.studies) return res.sendStatus(400)

      const study = participant.studies.find((s) => {
        return s.studyKey === newTasksResults.studyKey
      })
      if (!study) return res.status(400).send('No study with key ' + newTasksResults.studyKey)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newTasksResults.taskId)
      if (!taskItem) return res.status(400).send('No task with id ' + newTasksResults.taskId)

      trans = await DAO.startTransaction([DAO.tasksResultsTransaction(), DAO.participantsTransaction()])

      // store the database data
      newTasksResults = await DAO.createTasksResults(newTasksResults, trans)

      if (newTasksResults.data) {
        // separate data from the object stored on the database
        const resultsData = newTasksResults.data
        delete newTasksResults.data

        // save the attachment
        const filename = newTasksResults._key + '.json'
        const writer = await saveAttachment(newTasksResults.userKey, newTasksResults.studyKey, newTasksResults.taskId, filename)
        await writer.writeChunk(JSON.stringify(resultsData))
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
      applogger.info({ userKey: req.user._key, taskId: newTasksResults.taskId, studyKey: newTasksResults.studyKey }, 'Participant has sent tasks results')
      auditLogger.log('tasksResultsCreated', req.user._key, newTasksResults.studyKey, newTasksResults.taskId, 'Tasks results created by participant with key ' + participant._key + ' for study with key ' + newTasksResults.studyKey, 'tasksResults', newTasksResults._key, newTasksResults)
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot store new tasks results')
      res.sendStatus(500)
      DAO.abortTransaction(trans)
    }
  }
}
