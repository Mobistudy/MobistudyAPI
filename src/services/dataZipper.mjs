/**
* This zips data collected in a study.
*/
import fs from 'fs'
import archiver from 'archiver'
import { applogger } from './logger.mjs'
import { DAL } from '../DAL/DAL.mjs'
import { getAttachments } from '../../src/services/attachments.mjs'

export default {

  tempFolderPath: './tmp/',

  /**
   * Purges old zip files
   * @param timeoutSecs files older than this value, in secs, are purged
   */
  async purgeOldFiles (timeoutSecs) {
    applogger.debug('Purging zip files older than ' + timeoutSecs + ' s')
    const filenames = await fs.promises.readdir(this.tempFolderPath)
    const timeAgo = new Date(new Date().getTime() - (timeoutSecs * 1000))

    for (const filename of filenames) {
      if (filename.endsWith('.zip')) {
        const stat = await fs.promises.stat(this.tempFolderPath + filename)
        if (timeoutSecs === -1 || stat.birthtime < timeAgo) {
          await fs.promises.unlink(this.tempFolderPath + filename)
        }
      }
    }
  },

  /**
   * Creates a zip file with the data of a study
   * @param studyKey the study key
   * @returns a promise
   */
  async zipStudyData (studyKey) {
    return new Promise((resolve, reject) => {
      let finished = false
      // the filename is composed of a 6 digits random number  + the study key
      const filename = (Math.floor((Math.random() * 999999)) + '').padStart(6, '0') + '_' + studyKey + '.zip'
      applogger.info('Creating zip file for study ' + studyKey + ', filename: ' + filename)

      const output = fs.createWriteStream(this.tempFolderPath + filename)
      const archive = archiver('zip', {
        zlib: { level: 9 } // compression level
      })
      output.on('end', function () {
        if (!finished) resolve(filename)
        finished = true
      })
      output.on('finish', function () {
        if (!finished) resolve(filename)
        finished = true
      })
      output.on('close', function () {
        if (!finished) resolve(filename)
        finished = true
      })

      archive.pipe(output)

      archive.on('warning', function (err) {
        // console.warn(err)
        applogger.warn(err, 'Warning while creating zip file for study ' + studyKey)
      })

      // catch error explicitly
      archive.on('error', function (err) {
        reject(err)
      })

      // users
      // query params: userEmail, roleType, studyKeys, sortDirection, offset, maxResultsNumber, dataCallback
      DAL.getUsers(null, 'participant', [studyKey], null, null, null, (u) => {
        archive.append(JSON.stringify(u), { name: 'users/' + u._key + '.json' })
      }).then(() => {
        // participants
        return DAL.getParticipantsByStudy(studyKey, null, (p) => {
          archive.append(JSON.stringify(p), { name: 'participants/' + p._key + '.json' })
        })
      }).then(() => {
        // tasks results
        return DAL.getTasksResultsByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'taskresults/' + a._key + '.json' })
        })
      }).then(() => {
        // attachments
        return getAttachments(studyKey, (res) => {
          archive.append(res.content, { name: 'attachments/' + res.task + '/' + res.user + '/' + res.file })
        })
      })
        // will be removed when new version of app is fully rolled out
        .then(() => {
          // answers
          return DAL.getAnswersByStudy(studyKey, (a) => {
            archive.append(JSON.stringify(a), { name: 'answers/' + a._key + '.json' })
          })
        }).then(() => {
          // healthstore
          return DAL.getHealthStoreDataByStudy(studyKey, (a) => {
            archive.append(JSON.stringify(a), { name: 'healthstore/' + a._key + '.json' })
          })
        }).then(() => {
          // miband
          return DAL.getMiband3DataByStudy(studyKey, (a) => {
            archive.append(JSON.stringify(a), { name: 'miband3/' + a._key + '.json' })
          })
        }).then(() => {
          // peakflow
          return DAL.getPeakFlowsByStudy(studyKey, (a) => {
            archive.append(JSON.stringify(a), { name: 'peakflow/' + a._key + '.json' })
          })
        }).then(() => {
          // position
          return DAL.getPositionsByStudy(studyKey, (a) => {
            archive.append(JSON.stringify(a), { name: 'position/' + a._key + '.json' })
          })
        })
        .then(() => {
          return archive.finalize()
        }).catch((err) => {
          reject(err)
        })
    })
  }
}
