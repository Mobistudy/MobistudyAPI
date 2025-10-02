import { applogger } from '../services/logger.mjs'
import { DAL } from '../DAL/DAL.mjs'
import attachments from '../services/attachments.mjs'


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

      // key value store where key is the date (YYYY-MM-DD) and value is the sleep summary for that date
      let sleepSummary = {}

      // get the task results
      for (const trk of unprocessedTaskResultsKeys) {
        /** @type {TaskResults} */
        const tr = await DAL.getOneTaskResult(trk)

        if (!tr) {
          applogger.warn(`Task result ${trk} not found, skipping`)
          continue
        }
        if (tr.taskType !== 'jstyle') {
          applogger.warn(`Task result ${trk} is not of type jstyle, skipping`)
          continue
        }

        const fileName = tr.attachments[0]
        if (!fileName) {
          applogger.warn(`Task result ${trk} has no attachments, skipping`)
          continue
        }

        // get the reader
        const readStream = await attachments.getAttachmentReader(studyKey, userKey, tr.taskId, fileName)
        const fileContent = await streamToString(readStream)
        /** @type {JStyleData} */
        const jstyleData = JSON.parse(fileContent)
        applogger.debug(`Read attachment ${fileName} for task result ${trk}, content length ${fileContent.length}`)

        // sort the data by date, ascending
        jstyleData.sleep.sort((a, b) => new Date(a.date) - new Date(b.date))

        // parse the sleep data
        let dateKey // holder of the date key for the current record
        let previousRecordEndDate = null
        for (let i = 0; i < jstyleData.sleep.length; i++) {
          const sleepRecord = jstyleData.sleep[i]
          // read the date and convert to local time
          let TZ = tr.phone?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Stockholm'
          let recordDate = convertTZ(sleepRecord.date, TZ)

          // compare with previous record, if it's close in time, we associate this to the same day, even if it is past midnight
          let updateDateKey = true
          if (previousRecordEndDate) {
            const timeDiff = recordDate.getTime() - previousRecordEndDate.getTime()
            if (Math.abs(timeDiff) < 15 * 60 * 1000) { // less than 15 minutes difference
              // use the previous date key
              updateDateKey = false
            }
          }
          if (updateDateKey) {
            dateKey = recordDate.getFullYear() + '-' + String(recordDate.getMonth() + 1).padStart(2, '0') + '-' + String(recordDate.getDate()).padStart(2, '0')
          }


          if (!sleepSummary[dateKey]) {
            sleepSummary[dateKey] = {
              sleepDurationMins: 0,
              sleepOnset: new Date('2100-01-01T00:00:00Z'), // far future date
              sleepOffset: new Date('1900-01-01T00:00:00Z'), // far past date
              averageSleepQuality: 0,
              sleepQualityRecords: 0
            }
          }
          if (recordDate < sleepSummary[dateKey].sleepOnset) {
            sleepSummary[dateKey].sleepOnset = recordDate
          }
          if (recordDate > sleepSummary[dateKey].sleepOffset) {
            sleepSummary[dateKey].sleepOffset = recordDate
          }
          sleepSummary[dateKey].sleepQualityRecords += sleepRecord.sleepQuality.length
          for (const sq of sleepRecord.sleepQuality) {
            sleepSummary[dateKey].averageSleepQuality += sq.quality
          }
          previousRecordEndDate = new Date(new Date(sleepRecord.date).getTime() + (sleepRecord.sleepQuality.length * sleepRecord.sleepQualityDurationMins * 60 * 1000))
        }

        // now save the data as indicators, one per day
        for (const dateKey of Object.keys(sleepSummary)) {
          applogger.debug(sleepSummary[dateKey], `Sleep summary for ${dateKey}`)

          // complete indicators
          sleepSummary[dateKey].averageSleepQuality /= sleepSummary[dateKey].sleepQualityRecords || 1
          sleepSummary[dateKey].sleepDurationMins = Math.round((sleepSummary[dateKey].sleepOffset.getTime() - sleepSummary[dateKey].sleepOnset.getTime()) / (1000 * 60))
          // get indicators for this date, if any

          // get the sleep onset as date only
          let indicatorsDate = new Date(sleepSummary[dateKey].sleepOnset)
          indicatorsDate.setHours(0, 0, 0, 0)

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
              if (tri.indicators.sleepDurationMins) {
                // TODO: there is the unlikely case that two sleep records on the same day are processed based on different task results, in that case the indicators need to be accumulated, not overwritten
                applogger.warn(`Indicator ${tri._key} already has sleep indicators set, overwriting with new value`)
              }

              tri.indicators.sleepDurationMins = sleepSummary[dateKey].sleepDurationMins
              tri.indicators.sleepOnset = sleepSummary[dateKey].sleepOnset
              tri.indicators.sleepOffset = sleepSummary[dateKey].sleepOffset
              tri.indicators.averageSleepQuality = sleepSummary[dateKey].averageSleepQuality
              tri.indicators.sleepQualityRecords = sleepSummary[dateKey].sleepQualityRecords
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
                sleepOnset: sleepSummary[dateKey].sleepOnset,
                sleepOffset: sleepSummary[dateKey].sleepOffset,
                averageSleepQuality: sleepSummary[dateKey].averageSleepQuality,
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


