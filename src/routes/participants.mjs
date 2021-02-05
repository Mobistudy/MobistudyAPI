'use strict'

/**
* This provides the API endpoints for the participants profiles.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { studyStatusUpdateCompose } from '../services/emailComposer.mjs'
import { sendEmail } from '../services/mailSender.mjs'

const router = express.Router()

export default async function () {

  // query parameters:
  // teamKey, studyKey, currentStatus
  router.get('/participants', passport.authenticate('jwt', { session: false }), async function (req, res) {
    console.log('Getting participants...')
    try {
      if (req.user.role === 'participant') {
        // participants can retrieve only themselves
        let result = await DAO.getParticipantByUserKey(req.user._key)
        res.send(result)
      } else if (req.user.role === 'researcher' || req.user.role === 'admin') {
        if (req.user.role === 'researcher') {
          // extra check about the teams
          if (req.query.teamKey) {
            let team = await DAO.getOneTeam(req.query.teamKey)
            if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          }
          if (req.query.studyKey) {
            let team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
            if (team.length === 0) return res.sendStatus(403)
          }
        }
        let participants = []
        if (req.query.studyKey) {
          participants = await DAO.getParticipantsByStudy(req.query.studyKey, req.query.currentStatus)
        } else if (req.query.teamKey) {
          participants = await DAO.getParticipantsByTeam(req.query.teamKey, req.query.currentStatus)
        } else if (req.query.currentStatus) {
          if (req.user.role === 'researcher') {
            participants = await DAO.getParticipantsByResearcher(req.user._key, req.query.currentStatus)
          } else { // admin
            participants = await DAO.getParticipantsByCurrentStatus(req.query.currentStatus)
          }
        } else {
          if (req.user.role === 'researcher') {
            participants = await DAO.getParticipantsByResearcher(req.user._key)
          } else {
            participants = await DAO.getAllParticipants()
          }
        }
        res.json(participants)
      } else res.sendStatus(403)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve participants')
      res.sendStatus(500)
    }
  })

  router.get('/participants/:participant_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'participant' && req.params.participant_key !== req.user._key) return res.sendStatus(403)
      else if (req.user.role === 'researcher') {
        let parts = await DAO.getParticipantsByResearcher(req.user._key)
        if (!parts.includes(req.params.participant_key)) return res.sendStatus(403)
      } else {
        let participant = await DAO.getOneParticipant(req.params.participant_key)
        res.send(participant)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve participant with _key ' + req.params.participant_key)
      res.sendStatus(500)
    }
  })

  router.post('/participants', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newparticipant = req.body
    newparticipant.createdTS = new Date()
    try {
      if (req.user.role === 'participant') {
        newparticipant = await DAO.createParticipant(newparticipant)
        res.send(newparticipant)
        applogger.info({ userKey: newparticipant.userKey, participantKey: newparticipant._key }, 'New participant profile created')
        auditLogger.log('participantCreated', req.user._key, undefined, undefined, 'New participant created', 'participants', newparticipant._key, newparticipant)
      } else res.sendStatus(403)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new participant')
      res.sendStatus(500)
    }
  })

  // Delete a user
  router.delete('/participants/byuserkey/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role === 'participant' && req.params.userKey !== req.user._key) return res.sendStatus(403)
    if (req.user.role === 'researcher') return res.status(403)
    try {
      let userKey = req.params.userKey
      let participant = await DAO.getParticipantByUserKey(userKey)
      if (!participant) return res.status(404)

      // Remove Answers
      await DAO.deleteAnswersByUser(userKey)

      // Remove Health Store Data
      await DAO.deleteHealthStoreDataByUser(userKey)

      // Remove Miband3 Data
      await DAO.deleteMiband3DataByUser(userKey)

      // Remove QCST Data
      await DAO.deleteQCSTDataByUser(userKey)

      // Remove SMWT Data
      await DAO.deleteSMWTDataByUser(userKey)

      // Remove Audit logs
      await DAO.deleteLogsByUser(userKey)

      await DAO.removeParticipant(participant._key)
      await DAO.removeUser(req.params.userKey)
      res.sendStatus(200)
      applogger.info({ userKey: participant._key }, 'Participant profile deleted')
      auditLogger.log('participantDeleted', req.user._key, undefined, undefined, 'Participant deleted', 'participants', participant._key, undefined)
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot delete participant')
      res.sendStatus(500)
    }
  })

  // Delete Specified participant. Called from Web API by Admin.
  router.delete('/participants/:participant_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let partKey = req.params.participant_key
      // Get User Key of participant first. Then remove participant and then user.
      let participant = await DAO.getOneParticipant(partKey)
      if (participant === null) return res.sendStatus(404)
      // Participant can remove only himself from Participant and Users DB
      let userKey = participant.userKey
      if (req.user.role === 'researcher') return res.sendStatus(403)
      if (req.user.role === 'participant' && req.params.userKey !== req.user._key) return res.sendStatus(403)

      // Remove Answers
      await DAO.deleteAnswersByParticipant(userKey)

      // Remove Health Store Data
      await DAO.deletHealthStoreDataByParticipant(userKey)

      // Remove Miband3 Data TODO: Refactor the above, answers and healthData as well
      await DAO.deleteMiband3DataByParticipant(userKey)

      // Remove QCST Data
      await DAO.deleteQCSTDataByParticipant(userKey)

      // Remove SMWT Data
      await DAO.deleteSMWTDataByParticipant(userKey)

      // Remove Audit logs
      await DAO.deleteLogsByUser(userKey)

      await DAO.removeParticipant(partKey)
      await DAO.removeUser(userKey)
      res.sendStatus(200)
      applogger.info({ participantKey: partKey }, 'Participant profile deleted')
      auditLogger.log('participantDeleted', req.user._key, undefined, undefined, 'Participant deleted', 'participants', partKey, undefined)
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot delete participant')
      res.sendStatus(500)
    }
  })

  // Participant by userkey
  router.get('/participants/byuserkey/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role === 'participant' && req.params.userKey !== req.user._key) return res.sendStatus(403)
    if (req.user.role === 'researcher') {
      let allowedParts = await DAO.getParticipantsByResearcher(req.user._key)
      if (!allowedParts.includes(req.params.user)) return res.sendStatus(403)
    }
    try {
      let participant = await DAO.getParticipantByUserKey(req.params.userKey)
      if (!participant) return res.sendStatus(404)
      res.send(participant)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve participant with userKey ' + req.params.userKey)
      res.sendStatus(500)
    }
  })

  // this is meant to be used to update the info not related to the studies
  router.patch('/participants/byuserkey/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newparticipant = req.body
    if (newparticipant.createdTS) delete newparticipant.createdTS
    // timestamp the update
    newparticipant.updatedTS = new Date()
    // ignore the studies property
    delete newparticipant.studies
    if (req.user.role === 'participant' && req.params.userKey !== req.user._key) return res.sendStatus(403)
    if (req.user.role === 'researcher') return res.status(403)
    try {
      let participant = await DAO.getParticipantByUserKey(req.params.userKey)
      if (!participant) return res.status(404)
      newparticipant = await DAO.updateParticipant(participant._key, newparticipant)
      res.send(newparticipant)
      applogger.info({ participantKey: participant._key }, 'Participant profile updated')
      auditLogger.log('participantUpdated', req.user._key, undefined, undefined, 'Participant updated', 'participants', participant._key, newparticipant)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot update participant with _key ' + req.params.participant_key)
      res.sendStatus(500)
    }
  })

  // this endpoint is for the app to update the status of the participant regarding a study
  // the data sent must contain the current status and the timestamp
  // withdrawalReason must be added in the case of a withdrawal
  // criteriaAnswers must be added in case of acceptance of not eligible
  // taskItemsConsent and extraItemsConsent can be added, but is not mandatory
  // example: { currentStatus: 'withdrawn', timestamp: 'ISO string', withdrawalReason: 'quit' }
  // Send Emails on change of status: active, completed, withdrawn
  router.patch('/participants/byuserkey/:userKey/studies/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let userKey = req.params.userKey
    let studyKey = req.params.studyKey
    let payload = req.body
    payload.studyKey = studyKey
    let currentStatus = undefined
    let updatedCurrentStatus = undefined
    let taskItemsCons = []
    let extraItemsCons = []
    try {
      if (req.user.role === 'participant' && req.params.userKey !== req.user._key) return res.sendStatus(403)
      if (req.user.role === 'researcher') {
        let allowedParts = await DAO.getParticipantsByResearcher(req.user._key)
        if (!allowedParts.includes(req.params.user)) return res.sendStatus(403)
      }
      if (!userKey || !studyKey) return res.sendStatus(400)
      let participant = await DAO.getParticipantByUserKey(userKey)
      if (!participant) return res.status(404)

      // Updated Time Stamp
      participant.updatedTS = new Date()

      // Create studies array if none exist, else find existing one
      let studyIndex = -1
      if (!participant.studies) {
        participant.studies = []
      } else {
        studyIndex = participant.studies.findIndex((s) => {
          return s.studyKey === studyKey
        })
      }
      if (studyIndex === -1) {
        participant.studies.push({
          studyKey: studyKey
        })
        studyIndex = participant.studies.length - 1
      }
      // Get study status before patch update
      for (let i = 0; i < participant.studies.length; i++) {
        // Before a participant accepts a study, there will be no current status in the participant
        if (participant.studies[i].studyKey === studyKey && participant.studies[i].currentStatus !== undefined) {
          currentStatus = participant.studies[i].currentStatus
        }
      }
      // TODO: use [deepmerge](https://github.com/TehShrike/deepmerge) instead
      participant.studies[studyIndex] = payload
      // Update the DB
      await DAO.updateParticipant(participant._key, participant)

      // if there is a change in status, then send email reflecting updated status change
      if (updatedCurrentStatus !== currentStatus) {
        let em = await studyStatusUpdateCompose(studyKey, participant)
        sendEmail(req.user.email, em.title, em.content)
      }
      res.sendStatus(200)
      applogger.info({ participantKey: participant._key, study: payload }, 'Participant has changed studies status')
      auditLogger.log('participantStudyUpdate', req.user._key, payload.studyKey, undefined, 'Participant with key ' + participant._key + ' has changed studies status', 'participants', participant._key, payload)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot update participant with user key ' + userKey)
      res.sendStatus(500)
    }
  })


  // this endpoint is for the app to update the status of the participant regarding a study and a task
  // example: { taskId: 3, consented: true, lastExecuted: "2019-02-27T12:46:07.294Z", lastMiband3SampleTS: "2019-03-05T12:46:07.294Z" }
  router.patch('/participants/studies/:studyKey/taskItemsConsent/:taskId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let userKey = req.user._key
    let studyKey = req.params.studyKey
    let taskId = req.params.taskId
    let payload = req.body
    payload.studyKey = studyKey

    try {
      if (req.user.role != 'participant') return res.sendStatus(403)
      if (!userKey || !studyKey) return res.sendStatus(400)
      let participant = await DAO.getParticipantByUserKey(userKey)
      if (!participant) return res.status(404)

      // find the study
      let studyIndex = -1
      if (!participant.studies) return res.status(404)

      studyIndex = participant.studies.findIndex((s) => {
        return s.studyKey === studyKey
      })
      if (studyIndex === -1) return res.status(404)

      let taskIndex = -1
      participant.studies[studyIndex].taskItemsConsent.findIndex((t) => {
        return t.taskId === taskId
      })
      if (taskIndex === -1) return res.status(404)

      // TODO: use [deepmerge](https://github.com/TehShrike/deepmerge) instead
      participant.studies[studyIndex].taskItemsConsent[taskIndex] = payload

      // Update the DB
      await DAO.updateParticipant(participant._key, participant)

      res.sendStatus(200)
      applogger.info({ participantKey: participant._key, taskItemConsent: payload }, 'Participant has changed task item consent status')
      auditLogger.log('participantStudyUpdate', req.user._key, payload.studyKey, undefined, 'Participant with key ' + participant._key + ' has changed task item consent status', 'participants', participant._key, payload)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot update participant with user key ' + userKey)
      res.sendStatus(500)
    }
  })

  // gets simple statistics about the study
  router.get('/participants/statusStats/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'participant') {
        res.sendStatus(403)
      } else if (req.user.role === 'researcher') {
        if (req.user.role === 'researcher') {
          let team = await DAO.getAllTeams(req.user._key, req.params.studyKey)
          if (team.length === 0) return res.sendStatus(403)
        }
        let participants = await DAO.getParticipantsStatusCountByStudy(req.params.studyKey)
        res.json(participants)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve participants')
      res.sendStatus(500)
    }
  })

  return router
}
