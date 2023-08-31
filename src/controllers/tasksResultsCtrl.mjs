/**
 * This provides the API endpoints for all tasks results.
 */
import { DAL } from '../DAL/DAL.mjs'
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
    const accelerationSampleSchema = JSON.parse(
      await readFile('./models/accelerationSample.json')
    )
    const orientationSampleSchema = JSON.parse(
      await readFile('./models/orientationSample.json')
    )

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

    const drawingSummarySchema = JSON.parse(
      await readFile('./models/drawingSummary.json')
    )
    const drawingDataSchema = JSON.parse(
      await readFile('./models/drawingData.json')
    )

    const dataQuerySummarySchema = JSON.parse(
      await readFile('./models/dataQuerySummary.json')
    )
    const dataQueryDataSchema = JSON.parse(
      await readFile('./models/dataQueryData.json')
    )

    const miband3SummarySchema = JSON.parse(
      await readFile('./models/miband3Summary.json')
    )
    const miband3DataSchema = JSON.parse(
      await readFile('./models/miband3Data.json')
    )

    const smwtSummarySchema = JSON.parse(
      await readFile('./models/smwtSummary.json')
    )
    const smwtDataSchema = JSON.parse(
      await readFile('./models/smwtData.json')
    )

    const po60SummarySchema = JSON.parse(
      await readFile('./models/po60Summary.json')
    )
    const po60DataSchema = JSON.parse(
      await readFile('./models/po60Data.json')
    )

    const positionSummarySchema = JSON.parse(
      await readFile('./models/positionSummary.json')
    )
    const positionDataSchema = JSON.parse(
      await readFile('./models/positionData.json')
    )

    const peakFlowSummarySchema = JSON.parse(
      await readFile('./models/peakFlowSummary.json')
    )
    const peakFlowDataSchema = JSON.parse(
      await readFile('./models/peakFlowData.json')
    )

    const ajv = new Ajv({
      schemas: [
        accelerationSampleSchema,
        orientationSampleSchema,
        tasksResultsSchema,
        answersSummarySchema,
        answersDataSchema,
        fingerTappingSummarySchema,
        fingerTappingDataSchema,
        holdPhoneSummarySchema,
        holdPhoneDataSchema,
        tugtSummarySchema,
        tugtDataSchema,
        vocalizaitonSummarySchema,
        drawingSummarySchema,
        drawingDataSchema,
        dataQuerySummarySchema,
        dataQueryDataSchema,
        miband3SummarySchema,
        miband3DataSchema,
        smwtSummarySchema,
        smwtDataSchema,
        po60SummarySchema,
        po60DataSchema,
        positionSummarySchema,
        positionDataSchema,
        peakFlowSummarySchema,
        peakFlowDataSchema
      ],
      allowUnionTypes: true
    })

    this.validate = ajv.getSchema('https://mobistudy.org/models/tasksResults.json')
  },

  /**
   * Get all tasks results
   * optional query params: studyKey to filter by study, userKey to filter also by user
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
        // check if researcher can access study
        const team = await DAL.getAllTeams(req.user._key, req.query.studyKey)
        if (team.length === 0) {
          const errmess = 'Researcher cannot request tasks results for a study (s)he is not involved in'
          applogger.warn(errmess)
          return res.status(403).send(errmess)
        } else {
          if (req.query.userKey) { // study and user
            const resultsData = await DAL.getTasksResultsByUserAndStudy(req.query.userKey, req.query.studyKey)
            return res.send(resultsData)
          } else { // study only
            const resultsData = await DAL.getTasksResultsByStudy(req.query.studyKey)
            return res.send(resultsData)
          }
        }
      } else if (req.user.role === 'participant') {
        // participant requests tasks results
        let resultsData
        if (req.query && req.query.studyKey) {
          // results for a given study
          resultsData = await DAL.getTasksResultsByUserAndStudy(req.user._key, req.query.studyKey)
        } else {
          // results for all studies
          resultsData = await DAL.getTasksResultsByUser(req.user._key)
        }
        res.status(200).send(resultsData)
      } else {
        // admin
        const resultsData = await DAL.getAllTasksResults()
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
    let newTasksResults = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)

    if (!newTasksResults.studyKey) return res.sendStatus(400)

    try {
      const valid = this.validate(newTasksResults)
      if (!valid) {
        applogger.error({ errors: this.validate.errors, input: newTasksResults }, 'Tasks results does not validate against schema')
        return res.status(400).send('tasks results does not validate against schema')
      }
      newTasksResults.userKey = req.user._key
      if (!newTasksResults.createdTS) newTasksResults.createdTS = new Date()

      const participant = await DAL.getParticipantByUserKey(req.user._key)
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

      trans = await DAL.startTransaction([DAL.tasksResultsTransaction(), DAL.participantsTransaction()])

      // store the results on the database

      // strip data first
      let resultsData = false
      if (newTasksResults.data) {
        // separate data from the object stored on the database
        resultsData = newTasksResults.data
        delete newTasksResults.data
      }
      newTasksResults = await DAL.createTasksResults(newTasksResults, trans)

      // save the data on file and add attachments
      if (resultsData) {
        // save the attachment
        const filename = newTasksResults._key + '.json'
        const writer = await getAttachmentWriter(newTasksResults.userKey, newTasksResults.studyKey, newTasksResults.taskId, filename)
        await writer.write(JSON.stringify(resultsData))
        await writer.end()

        // save the filename
        newTasksResults.attachments = [filename]
        newTasksResults = await DAL.replaceTasksResults(newTasksResults._key, newTasksResults, trans)
      }

      // also update task status
      taskItem.lastExecuted = newTasksResults.createdTS
      await DAL.replaceParticipant(participant._key, participant, trans)

      DAL.endTransaction(trans)

      res.status(200).send({
        _key: newTasksResults._key
      })
      applogger.info({ userKey: req.user._key, taskId: newTasksResults.taskId, studyKey: newTasksResults.studyKey }, 'Participant has sent tasks results for task ' + newTasksResults.type)
      auditLogger.log('tasksResultsCreated', req.user._key, newTasksResults.studyKey, newTasksResults.taskId, 'Results received for ' + newTasksResults.type + ' task, task id ' + newTasksResults.taskId + ', by participant ' + participant._key + ' for study ' + newTasksResults.studyKey, 'tasksResults', newTasksResults._key)
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot store new tasks results')
      res.sendStatus(500)
      if (trans) DAL.abortTransaction(trans)
    }
  }
}
