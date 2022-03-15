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
            const Vocalization = await DAO.getVocalizationDataByStudy(req.query.studyKey)
            res.send(Vocalization)
          }
        } else if (req.user.role === 'participant') {
          const Vocalization = await DAO.getVocalizationByUser(req.user._key)
          res.send(Vocalization)
        } else {
          // admin
          const Vocalization = await DAO.getAllVocalization()
          res.send(Vocalization)
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getVocalizationByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev Vocalization data')
      res.sendStatus(500)
    }
  })

  router.post('/VocalizationData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newVocalization = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newVocalization.userKey = req.user._key
    if (!newVocalization.createdTS) newVocalization.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newVocalization.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newVocalization.taskId)
      if (!taskItem) return res.sendStatus(400)

      trans = await DAO.startTransaction([DAO.VocalizationTransaction(), DAO.participantsTransaction()])

      // separate raw data from the object stored on the database
      const positions = newVocalization.positions
      delete newVocalization.positions
      const steps = newVocalization.steps
      delete newVocalization.steps

      // store the data on the database
      newVocalization = await DAO.createVocalization(newVocalization, trans)

      // save the attachments
      const positionsFilename = 'positions_' + newVocalization._key + '.json'
      let writer = await saveAttachment(newVocalization.userKey, newVocalization.studyKey, newVocalization.taskId, positionsFilename)
      await writer.writeChunk(JSON.stringify(positions))
      await writer.end()
      const stepsFilename = 'steps_' + newVocalization._key + '.json'
      writer = await saveAttachment(newVocalization.userKey, newVocalization.studyKey, newVocalization.taskId, stepsFilename)
      await writer.writeChunk(JSON.stringify(steps))
      await writer.end()

      // save the filename
      newVocalization.attachments = [positionsFilename, stepsFilename]
      newVocalization = await DAO.replaceVocalization(newVocalization._key, newVocalization, trans)

      // also update task status
      taskItem.lastExecuted = newVocalization.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant, trans)

      // all done now
      DAO.endTransaction(trans)

      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newVocalization.taskId, studyKey: newVocalization.studyKey }, 'Participant has sent a new Vocalization')
      auditLogger.log('VocalizationDataCreated', req.user._key, newVocalization.studyKey, newVocalization.taskId, 'Vocalization data created by participant with key ' + participant._key + ' for study with key ' + newVocalization.studyKey, 'VocalizationData', newVocalization._key, newVocalization)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new Vocalization')
      res.sendStatus(500)
    }
  })

  return router
}
