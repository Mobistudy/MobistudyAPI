import { applogger } from '../services/logger.mjs'
import { DAL } from '../DAL/DAL.mjs'
import attachments from '../services/attachments.mjs'
import * as stats from '../services/stats.mjs'

/**
 * Import types from the datamodels.
 * @typedef {import("../../models/jsdocs.js").TaskResults} TaskResults
 * @typedef {import("../../models/jsdocs.js").TaskResultIndicators} TaskResultIndicators
 * @typedef {import("../../models/jsdocs.js").JStyleData} JStyleData
 */

function convertTZ (date, tzString) {
  return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
}

async function streamToString (stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}


export default {
  producerName: 'jstyle-sleep-daily-stats',

  taskType: 'jstyle',

  async processJStyleSleepStats (studyKey, userKey, taskIds) {
    if (!studyKey) throw new Error('studyKey is required')
    if (!userKey) throw new Error('userKey is required')
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) throw new Error('taskIds is required and should be a non-empty array')

    // get the task results that have not been processed yet
    const unprocessedTaskResultsKeys = await DAL.findUnprocessedTaskResults(
      studyKey,
      userKey,
      this.producerName,
      taskIds
    )

    if (unprocessedTaskResultsKeys.length === 0) {
      applogger.debug(`No unprocessed task results for study ${studyKey}, user ${userKey}, producer ${this.producerName}, taskIds ${taskIds}`)
    } else {
      applogger.info(`Processing ${unprocessedTaskResultsKeys.length} unprocessed task results for study ${studyKey}, user ${userKey}, producer ${this.producerName}, taskIds ${taskIds}`)

      // get the task results
      for (const trk of unprocessedTaskResultsKeys) {
        // key value store where key is the date (YYYY-MM-DD) and value is the sleep summary for that date
        let sleepSummary = {}

        /** @type {TaskResults} */
        const tr = await DAL.getOneTaskResult(trk.taskResultKey)

        if (!tr) {
          applogger.warn(`Task result ${trk.taskResultKey} not found, skipping`)
          continue
        }
        if (tr.taskType !== 'jstyle') {
          applogger.warn(`Task result ${trk.taskResultKey} is not of type jstyle, skipping`)
          continue
        }

        const fileName = tr.attachments[0]
        if (!fileName) {
          applogger.warn(`Task result ${trk.taskResultKey} has no attachments, skipping`)
          continue
        }

        // get the reader
        const readStream = await attachments.getAttachmentReader(studyKey, userKey, tr.taskId, fileName)
        const fileContent = await streamToString(readStream)
        /** @type {JStyleData} */
        const jstyleData = JSON.parse(fileContent)
        applogger.debug(`Read attachment ${fileName} for task result ${trk.taskResultKey}, content length ${fileContent.length}`)

        // sort the data by date, ascending
        jstyleData.sleep.sort((a, b) => new Date(a.date) - new Date(b.date))

        applogger.trace('Processing sleep data ' + jstyleData.sleep.length + ' records')

        // parse the sleep data
        for (let i = 0; i < jstyleData.sleep.length; i++) {
          const sleepRecord = jstyleData.sleep[i]
          // read the date and convert to local time
          let TZ = tr.phone?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Stockholm'
          let recordStartDate = convertTZ(sleepRecord.date, TZ)
          let recordEndDate = new Date(new Date(sleepRecord.date).getTime() + (sleepRecord.sleepQuality.length * sleepRecord.sleepQualityDurationMins * 60 * 1000))

          applogger.trace({ start: recordStartDate, end: recordEndDate, qualitySamples: sleepRecord.sleepQuality.length, qualityDuration: sleepRecord.sleepQualityDurationMins }, 'Processing sleep record')

          let dateKey = recordStartDate.getFullYear() + '-' + String(recordStartDate.getMonth() + 1).padStart(2, '0') + '-' + String(recordStartDate.getDate()).padStart(2, '0')

          if (!sleepSummary[dateKey]) {
            sleepSummary[dateKey] = {
              sleepDurationMins: 0,
              meanSleepQuality: 0,
              stdSleepQuality: 0,
              sleepQualityRecords: 0
            }
          }
          sleepSummary[dateKey].startDate = recordStartDate
          sleepSummary[dateKey].sleepQualityRecords += sleepRecord.sleepQuality.length
          sleepSummary[dateKey].sleepDurationMins += sleepRecord.sleepQuality.length * sleepRecord.sleepQualityDurationMins
          // accumulate sleep quality to compute the mean
          let meanSQ = stats.mean(sleepRecord.sleepQuality)

          // compute standard deviation of sleep quality
          let variance = stats.variance(sleepRecord.sleepQuality, true)
          let stdDev = Math.sqrt(variance)

          if (sleepSummary[dateKey].sleepQualityRecords === 0) {
            sleepSummary[dateKey].meanSleepQuality = meanSQ
            sleepSummary[dateKey].stdSleepQuality = stdDev
          } else {
            // combine old mean with new mean
            let oldMean = sleepSummary[dateKey].meanSleepQuality
            let oldCount = sleepSummary[dateKey].sleepQualityRecords - sleepRecord.sleepQuality.length
            let newCount = sleepRecord.sleepQuality.length
            sleepSummary[dateKey].meanSleepQuality = stats.combineMeans(oldMean, oldCount, meanSQ, newCount)

            // combine old std dev with new std dev using Welford's method
            let oldStd = sleepSummary[dateKey].stdSleepQuality
            let newStd = stdDev
            let combinedVariance = stats.combineVariances(oldMean, oldStd ** 2, oldCount, meanSQ, newStd ** 2, newCount)
            sleepSummary[dateKey].stdSleepQuality = Math.sqrt(combinedVariance)
          }
        }

        // now save the data as indicators, one per day
        for (const dateKey of Object.keys(sleepSummary)) {
          // complete indicators
          sleepSummary[dateKey].averageSleepQuality /= (sleepSummary[dateKey].sleepQualityRecords || 1)

          applogger.trace(sleepSummary[dateKey], `Going to save sleep summary for ${dateKey}`)

          // get indicators for this date, if any

          // get the sleep onset as date only
          let indicatorsDate = new Date(sleepSummary[dateKey].startDate)
          indicatorsDate.setHours(0, 0, 0, 0)
          delete sleepSummary[dateKey].startDate

          // studyKey, userKey, producer, taskIds, date
          const existingIndicators = await DAL.getAllTaskIndicators(
            studyKey,
            userKey,
            this.producerName,
            null,
            indicatorsDate
          )
          if (existingIndicators.length > 0) {
            if (existingIndicators.length > 1) {
              applogger.warn(`Multiple (${existingIndicators.length}) existing indicators found for study ${studyKey}, user ${userKey}, producer ${this.producerName}, taskIds ${taskIds}, date ${indicatorsDate.toISOString().split('T')[0]}`)
            }
            applogger.debug(`Indicator already exists for study ${studyKey}, user ${userKey}, producer ${this.producerName}, taskIds ${taskIds}, date ${indicatorsDate.toISOString().split('T')[0]}`)
            for (const tri of existingIndicators) {
              if (tri.taskResultsKeys.includes(tr._key)) {
                applogger.warn(`Task result ${tr._key} already included in indicator ${tri._key} when processing new task result`)
              } else {
                // add the task result key to the existing indicator
                tri.taskResultsKeys.push(tr._key)
              }

              // set indicators

              if (!tri.indicators) tri.indicators = {}
              if (tri.indicators.sleepQualityRecords) {
                applogger.warn(`Indicator ${tri._key} already has sleep indicators set, combining with new value`)

                tri.indicators.sleepDurationMins += sleepSummary[dateKey].sleepDurationMins

                // combine old mean with new mean
                let oldMean = tri.indicators.meanSleepQuality || 0
                let oldCount = tri.indicators.sleepQualityRecords || 0
                let oldStd = tri.indicators.stdSleepQuality || 0
                let newCount = sleepSummary[dateKey].sleepQualityRecords || 0
                let newMean = sleepSummary[dateKey].meanSleepQuality
                let newStd = sleepSummary[dateKey].stdSleepQuality || 0
                sleepSummary[dateKey].meanSleepQuality = stats.combineMeans(oldMean, oldCount, newMean, newCount)
                let combinedVariance = stats.combineVariances(oldMean, oldStd ** 2, oldCount, newMean, newStd ** 2, newCount)
                sleepSummary[dateKey].stdSleepQuality = Math.sqrt(combinedVariance)
              } else {
                tri.indicators.sleepDurationMins = sleepSummary[dateKey].sleepDurationMins
                tri.indicators.meanSleepQuality = sleepSummary[dateKey].meanSleepQuality
                tri.indicators.stdSleepQuality = sleepSummary[dateKey].stdSleepQuality
                tri.indicators.sleepQualityRecords = sleepSummary[dateKey].sleepQualityRecords
              }
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
              producer: this.producerName,
              createdTS: new Date(),
              indicatorsDate, // store only the date part
              indicators: {
                sleepDurationMins: sleepSummary[dateKey].sleepDurationMins,
                meanSleepQuality: sleepSummary[dateKey].meanSleepQuality,
                stdSleepQuality: sleepSummary[dateKey].stdSleepQuality,
                sleepQualityRecords: sleepSummary[dateKey].sleepQualityRecords
              },
              taskResultsKeys: [tr._key]
            }
            // save the new indicator
            newIndicator = await DAL.createTaskIndicator(newIndicator)
            applogger.info(newIndicator, `Created new indicator for study ${studyKey}, user ${userKey}, producer ${this.producerName}, taskIds ${taskIds}, date ${indicatorsDate}`)
          }
        } // end of each date in sleep summary
      } // end for each task result

    }
  }
}


