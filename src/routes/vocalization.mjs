'use strict'

/**
 * This provides the API endpoints for the Vocalization of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // Get all Vocalization data
  // query params: studyKey to filter by study
  router.get('/VocalizationData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        if (req.user.role === 'researcher') {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const vocalizations = await DAO.getVocalizationsDataByStudy(req.query.studyKey)
            res.send(vocalizations)
          }
        } else if (req.user.role === 'participant') {
          const vocalizations = await DAO.getVocalizationsByUser(req.user._key)
          res.send(vocalizations)
        } else {
          // admin
          const vocalizations = await DAO.getAllVocalization()
          res.send(vocalizations)
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getVocalizationsByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve vocalizations data')
      res.sendStatus(500)
    }
  })

  router.post('/VocalizationData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newVocalization = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newVocalization.userKey = req.user._key
    if (!newVocalization.createdTS) newVocalization.createdTS = new Date()
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newVocalization.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newVocalization.taskId)
      if (!taskItem) return res.sendStatus(400)

      // separate raw data from the object stored on the database
      const report = newVocalization.report
      delete newVocalization.report
      const attachments = newVocalization.attachments
      delete newVocalization.attachments

      // store the data on the database
      newVocalization = await DAO.createVocalization(newVocalization)

      // save the attachments
      const reportFilename = 'report_' + newVocalization._key + '.json'
      let writer = await saveAttachment(newVocalization.userKey, newVocalization.studyKey, newVocalization.taskId, reportFilename)
      await writer.writeChunk(JSON.stringify(report))
      await writer.end()
      const attachmentsFilename = 'report_' + newVocalization._key + '.json'
      writer = await saveAttachment(newVocalization.userKey, newVocalization.studyKey, newVocalization.taskId, attachmentsFilename)
      await writer.writeChunk(JSON.stringify(attachments))
      await writer.end()

      // save the filename
      newVocalization.attachments = [reportFilename, attachmentsFilename]
      newVocalization = await DAO.replaceVocalization(newVocalization._key, newVocalization)

      // also update task status
      taskItem.lastExecuted = newVocalization.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)

      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newVocalization.taskId, studyKey: newVocalization.studyKey }, 'Participant has sent a new smwt')
      auditLogger.log('VocalizationDataCreated', req.user._key, newVocalization.studyKey, newVocalization.taskId, 'Vocalization data created by participant with key ' + participant._key + ' for study with key ' + newVocalization.studyKey, 'SMWTData', newVocalization._key, newVocalization)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new vocalization')
      res.sendStatus(500)
    }
  })

  return router
}
