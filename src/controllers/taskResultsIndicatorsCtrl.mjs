/**
 * This provides the API endpoints for all tasks results.
 */
import { DAL } from "../DAL/DAL.mjs"
import { applogger } from "../services/logger.mjs"
import jstyleActivityDailyStats from "../taskResultsIndicators/jstyleActivityDailyStats.mjs"
import jstyleSleepDailyStats from "../taskResultsIndicators/jstyleSleepDailyStats.mjs"

/**
 * Import types from the datamodels.
 * @typedef {import("../../models/jsdocs.js").TaskResults} TaskResults
 * @typedef {import("../../models/jsdocs.js").TaskResultIndicators} TaskResultIndicators
 */

export default {
  /**
   * Initialises the controller.
   */
  async init() {},

  /**
   * Provides task results indicators for a given study, task id and user.
   * @param {Object} req - express request, must include param: studyKey, userKey, optional as query: taskIds (comma separated), producer, offset, count
   * @param {Object} res - express response
   * @returns
   */
  async getTaskResultsIndicators(req, res) {
    try {
      if (req.user.role === "participant") {
        res.sendStatus(403)
      } else if (req.user.role === "researcher") {
        const { studyKey, userKey } = req.params
        if (!studyKey || !userKey) {
          return res
            .status(400)
            .send("Missing required parameters: studyKey, userKey")
        }

        if (req.user.role === "researcher") {
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
          if (taskIds.length === 0) {
            return res.status(400).send("If provided, taskIds must be a non-empty comma separated list of task ids")
          }
          // ids are passed as strings, but need to be converted to array of integers
          taskIdsArray = taskIds.map(id => parseInt(id))
        }

        let indicators = await DAL.getAllTaskIndicators(
          studyKey,
          userKey,
          producer,
          taskIdsArray,
          date ? new Date(date) : null,
          offset,
          count,
          null
        )
        return res.status(200).json(indicators)
      }
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, "Cannot retrieve participants")
      res.sendStatus(500)
    }
  },

  /**
   * Returns the list of available producers for task results indicators.
   * @param {Object} req
   * @param {Object} res
   */
  getTaskResultsIndicatorsProducers(req, res) {
    res.status(200).json([
      {
        name: jstyleActivityDailyStats.producerName,
        taskType: jstyleActivityDailyStats.taskType
      },
      {
        name: jstyleSleepDailyStats.producerName,
        taskType: jstyleSleepDailyStats.taskType
      }
    ])
  },

  /**
   * Gets the list of studies that have task results indicators producer.
   * Can only be called by admins.
   * @param {Object} req - the request object, must include param: producer (name of the producer).
   * @param {Object} res - the response object
   * @returns {Promise<void>}
   */
  async getStudiesWithTaskResultsIndicatorsProducer(req, res) {
     // check if the user is an admin
    if (req.user.role !== "admin") {
      return res.status(403).send("Only admins can run producers")
    }
    // check parameters in request
    const { producer } = req.params
    if (!producer) {
      return res.status(400).send("Missing required parameter: producer")
    }

    let studies = []
    if (producer === jstyleActivityDailyStats.producerName) {
      studies = await DAL.getStudiesWithTaskTypes(['jstyle'])
    } else if (producer === jstyleSleepDailyStats.producerName) {
      studies = await DAL.getStudiesWithTaskTypes(['jstyle'])
    } else {
      return res.status(400).send("Unknown producer")
    }
    return res.status(200).json(studies)
  },

  /**
   * Launches the processing of task results indicators for a given producer, study and taskId.
   * @param {Object} req - the request object, must include param: producer, studyKey, and taskId.
   * @param {Object} res - the response object
   */
  async runTaskResultsIndicatorsProducer(req, res) {
    // check if the user is an admin
    if (req.user.role !== "admin") {
      return res.status(403).send("Only admins can run producers")
    }
    // check parameters in request
    const { producer, studyKey, taskId } = req.params
    if (!producer || !studyKey || !taskId) {
      return res.status(400).send("Missing required parameters: producer, studyKey, taskId")
    }

    // producers work for each participant, so we need to get all participants in a given study and run the producer for each of them
    const participants = await DAL.getAllParticipants(null, studyKey)
    for (const participant of participants) {
      if (producer === jstyleActivityDailyStats.producerName) {
        await jstyleActivityDailyStats.processJStyleDailyStats(studyKey, participant._key, [parseInt(taskId)])
      } else if (producer === jstyleSleepDailyStats.producerName) {
        await jstyleSleepDailyStats.processJStyleSleepDailyStats(studyKey, participant._key, [parseInt(taskId)])
      } else {
        return res.status(400).send("Unknown producer")
      }
    }
    return res.status(200).send("Producer run successfully")
  }
};
