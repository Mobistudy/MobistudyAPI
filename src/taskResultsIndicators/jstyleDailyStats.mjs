import { applogger } from '../services/logger.mjs'
import { DAL } from '../DAL/DAL.mjs'

/**
 * Import types from the datamodels.
 * @typedef {import("../../models/jsdocs.js").TaskResults} TaskResults
 * @typedef {import("../../models/jsdocs.js").TaskResultIndicators} TaskResultIndicators
 */

let runningProcesses = {}

function convertTZ (date, tzString) {
  return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
}

export async function processJStyleDailyStats (studyKey, userKey, taskIds) {
  if (!studyKey) throw new Error('studyKey is required')
  if (!userKey) throw new Error('userKey is required')
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) throw new Error('taskIds is required and should be a non-empty array')
  if (runningProcesses[`${studyKey}-${userKey}-${taskIds.join(',')}`]) {
    applogger.warn('processJStyleDailyStats is already running, skipping this call')
    return
  }
  runningProcesses[`${studyKey}-${userKey}-${taskIds.join(',')}`] = true
  const jstyleProducerName = 'jstyle-daily-stats'

  // get the task results that have not been processed yet
  const unprocessedTaskResultsKeys = await DAL.findUnprocessedTaskResults(
    studyKey,
    userKey,
    jstyleProducerName,
    taskIds
  )

  if (unprocessedTaskResultsKeys.length === 0) {
    applogger.debug(`No unprocessed task results for study ${studyKey}, user ${userKey}, producer ${jstyleProducerName}, taskIds ${taskIds}`)
  } else {
    applogger.info(`Processing ${unprocessedTaskResultsKeys.length} unprocessed task results for study ${studyKey}, user ${userKey}, producer ${jstyleProducerName}, taskIds ${taskIds}`)

    // get the task results
    for (const trk of unprocessedTaskResultsKeys) {
      /** @type {TaskResults} */
      const tr = await DAL.getOneTaskResult(trk)
      if (!tr) {
        applogger.warn(`Task result ${trk} not found, skipping`)
        continue
      }
      if (tr.type !== 'jstyle') {
        applogger.warn(`Task result ${trk} is not of type jstyle, skipping`)
        continue
      }
      // accumulate daily stats
      if (tr.summary && tr.summary.activitySummary) {
        for (const dayStat of tr.summary.activitySummary) {
          // process each day stats
          // check if the indicator for this day already exists

          // convert the date to the time zone of the phone if available
          let TZ = tr.phone?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Stockholm'
          let indicatorsDate = convertTZ(dayStat.date, TZ)

          // daily stats only need the date part
          indicatorsDate.setHours(0, 0, 0, 0)

          // get indicators for this date
          // studyKey, userKey, producer, taskIds, date
          const existingIndicators = await DAL.getAllTaskIndicators(
            studyKey,
            userKey,
            jstyleProducerName,
            null,
            indicatorsDate
          )

          if (existingIndicators.length > 0) {
            if (existingIndicators.length > 1) {
              applogger.warn(`Multiple (${existingIndicators.length}) existing indicators found for study ${studyKey}, user ${userKey}, producer ${jstyleProducerName}, taskIds ${taskIds}, date ${indicatorsDate.toISOString().split('T')[0]}`)
            }
            applogger.debug(`Indicator already exists for study ${studyKey}, user ${userKey}, producer ${jstyleProducerName}, taskIds ${taskIds}, date ${indicatorsDate.toISOString().split('T')[0]}`)
            for (const tri of existingIndicators) {
              if (tri.taskResultsKeys.includes(tr._key)) {
                applogger.warn(`Task result ${tr._key} already included in indicator ${tri._key} when processing new task result`)
              } else {
                // add the task result key to the existing indicator
                tri.taskResultsKeys.push(tr._key)
              }

              // accumulate indicators
              tri.indicators.steps += dayStat.steps || 0
              tri.indicators.exerciseMinutes += dayStat.exerciseMinutes || 0
              tri.indicators.activeMinutes += dayStat.activeMinutes || 0
              tri.indicators.distance += dayStat.distance || 0
              tri.indicators.calories += dayStat.calories || 0
              tri.updatedTS = new Date()

              await DAL.updateTaskIndicator(tri._key, tri)
              applogger.info(`Added task result ${tr._key} to existing indicator ${tri._key} and accumulated indicators`)
            }
          } else {
            // create a new indicator
            /** @type {TaskResultIndicators} */
            let newIndicator = {
              userKey: userKey,
              studyKey: studyKey,
              taskIds: taskIds,
              participantKey: tr.participantKey,
              producer: jstyleProducerName,
              createdTS: new Date(),
              indicatorsDate: indicatorsDate, // store only the date part
              indicators: {
                steps: dayStat.steps || 0,
                exerciseMinutes: dayStat.exerciseMinutes || 0,
                activeMinutes: dayStat.activeMinutes || 0,
                distance: dayStat.distance || 0,
                calories: dayStat.calories || 0
              },
              taskResultsKeys: [tr._key]
            }
            // save the new indicator
            newIndicator = await DAL.createTaskIndicator(newIndicator)
            applogger.info(newIndicator, `Created new indicator for study ${studyKey}, user ${userKey}, producer ${jstyleProducerName}, taskIds ${taskIds}, date ${indicatorsDate}`)
          }
        }
      }
    }
  }
  runningProcesses[`${studyKey}-${userKey}-${taskIds.join(',')}`] = false
}
