/**
 * This provides the API endpoints for the study descriptions.
 */
import express from 'express'
import passport from 'passport'
import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { deleteAttachmentsByStudy } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // NEW GET STUDIES FUNCTION FOR TableStudies.vue
  router.get(
    '/getStudies',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      if (req.user.role !== 'admin') {
        console.log('not an admin')
        res.sendStatus(403)
      } else {
        try {
          const result = await DAL.getStudies(
            false,
            req.query.after,
            req.query.before,
            req.query.studyTitle,
            req.query.sortDirection,
            req.query.offset,
            req.query.count
          )
          console.log('routes/studies.mjs RESULT:', result)
          res.send(result)
        } catch (err) {
          applogger.error({ error: err }, 'Cannot retrieve studies')
          res.sendStatus(500)
        }
      }
    }
  )

  // NEW GET STUDIES COUNT FUNCTION
  router.get(
    '/getStudies/count',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      if (req.user.role !== 'admin') {
        console.log('not an admin')
        res.sendStatus(403)
      } else {
        try {
          const result = await DAL.getStudies(
            true,
            req.query.after,
            req.query.before,
            req.query.studyTitle,
            req.query.sortDirection,
            req.query.offset,
            req.query.count
          )
          res.send(result)
        } catch (err) {
          applogger.error({ error: err }, 'Cannot retrieve studies count')
          res.sendStatus(500)
        }
      }
    }
  )

  // query parameters:
  // teamKey (optional)
  router.get(
    '/studies',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const userKey = req.user._key
        let studies = []
        if (req.user.role === 'researcher') {
          if (req.query.teamKey) {
            const team = await DAL.getOneTeam(req.query.teamKey)
            if (!team.researchers.find(t => t.userKey === userKey)) {
              return res.sendStatus(403)
            }
            studies = await DAL.getAllTeamStudies(req.query.teamKey)
          } else {
            // limit the studies to the teams the user belongs to
            const teams = await DAL.getAllTeams(userKey)
            for (let i = 0; i < teams.lenght; i++) {
              const studies = await DAL.getAllTeamStudies(teams[i]._key)
              studies.push(studies)
            }
          }
        } else if (req.user.role === 'admin') {
          if (req.query.teamKey) {
            studies = await DAL.getAllTeamStudies(req.query.teamKey)
          } else {
            studies = await DAL.getAllStudies()
          }
        } else if (req.user.role === 'participant') {
          const part = await DAL.getParticipantByUserKey(userKey)
          studies = await DAL.getAllParticipantStudies(part._key)
        }

        res.send(studies)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve studies')
        res.sendStatus(500)
      }
    }
  )

  // get one speficic study by its key
  router.get(
    '/studies/:study_key',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const study = await DAL.getOneStudy(req.params.study_key)
        if (!study) res.sendStatus(404)
        else res.json(study)
      } catch (err) {
        applogger.error(
          { error: err },
          'Cannot retrieve study with _key ' + req.params.study_key
        )
        res.sendStatus(500)
      }
    }
  )

  // add a new study
  router.post(
    '/studies',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      let newstudy = req.body
      newstudy.createdTS = new Date()
      try {
        // TODO: do some access control, check the user is a researcher and that he belongs to the team
        newstudy = await DAL.createStudy(newstudy)
        res.send(newstudy)

        applogger.info(newstudy, 'New study description added')
        auditLogger.log(
          'studyDescriptionAdded',
          req.user._key,
          newstudy._key,
          undefined,
          'New study description added',
          'studies',
          newstudy._key
        )
      } catch (err) {
        applogger.error({ error: err }, 'Cannot store new study')
        res.sendStatus(500)
      }
    }
  )

  // update a study
  router.put(
    '/studies/:study_key',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      let newstudy = req.body
      newstudy.updatedTS = new Date()
      try {
        // TODO: do some access control
        newstudy = await DAL.replaceStudy(req.params.study_key, newstudy)
        res.send(newstudy)
        applogger.info(newstudy, 'Study replaced')
        auditLogger.log(
          'studyDescriptionReplaced',
          req.user._key,
          newstudy._key,
          undefined,
          'Study description replaced',
          'studies',
          newstudy._key
        )
      } catch (err) {
        applogger.error(
          { error: err },
          'Cannot replace study with _key ' + req.params.study_key
        )
        res.sendStatus(500)
      }
    }
  )

  // patch a study
  router.patch(
    '/studies/:study_key',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      let newstudy = req.body
      newstudy.updatedTS = new Date()
      try {
        // TODO: do some access control
        newstudy = await DAL.updateStudy(req.params.study_key, newstudy)
        res.send(newstudy)
        applogger.info(newstudy, 'Study updated')
        auditLogger.log(
          'studyDescriptionUpdated',
          req.user._key,
          newstudy._key,
          undefined,
          'Study description updated',
          'studies',
          newstudy._key
        )
      } catch (err) {
        applogger.error(
          { error: err },
          'Cannot update study with _key ' + req.params.study_key
        )
        res.sendStatus(500)
      }
    }
  )

  // delete a study
  router.delete(
    '/studies/:study_key',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      // If the user is a researcher, ensure that researcher has the same teamKey as the study
      let permissionToDelete = false
      const studykey = req.params.study_key
      if (!studykey) return res.sendStatus(400)
      if (req.user.role === 'researcher') {
        try {
          // Get Team Key of Study
          const study = await DAL.getOneStudy(studykey)
          const teamKeyOfStudy = study.teamKey
          // Get Team Key of User
          const userKey = req.user._key
          const team = await DAL.getAllTeams(userKey, studykey)
          // Validate they are the same
          if (teamKeyOfStudy === team[0]._key) permissionToDelete = true
        } catch (error) {
          applogger.error(
            { error: error },
            'Cannot confirm researcher has same teamKey as study ' + studykey
          )
          res.sendStatus(500)
        }
      }
      if (
        req.user.role === 'admin' ||
        (req.user.role === 'researcher' && permissionToDelete === true)
      ) {
        try {
          // Search participants for study
          const parts = await DAL.getParticipantsByStudy(studykey)
          if (parts) {
            for (let i = 0; i < parts.length; i++) {
              const partKey = parts[i]
              // For Each participant, delete the study key from accepted studies
              const participant = await DAL.getOneParticipant(partKey)
              let studyArray = participant.studies
              studyArray = studyArray.filter(
                (study) => study.studyKey !== studykey
              )
              participant.studies = studyArray
              await DAL.replaceParticipant(partKey, participant)
            }
          }
          // Data needs to be deleted before the study
          await DAL.deleteTasksResultsByStudy(studykey)
          await deleteAttachmentsByStudy(studykey)

          // Deleting the study
          await DAL.deleteStudy(studykey)

          res.sendStatus(200)
          applogger.info({ studyKey: studykey }, 'Study deleted')
          auditLogger.log(
            'studyDescriptionDeleted',
            req.user._key,
            studykey,
            undefined,
            'Study description with key ' + studykey + ' deleted',
            'studies',
            studykey
          )
        } catch (err) {
          applogger.error(
            { error: err },
            'Cannot delete study with _key ' + req.params.study_key
          )
          res.sendStatus(500)
        }
      } else res.sendStatus(403)
    }
  )

  // only called by participants, does the inclusion criteria matching too
  router.get(
    '/newStudies',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        if (req.user.role !== 'participant') return res.sendStatus(403)
        const studies = await DAL.getMatchedNewStudies(req.user._key)
        res.send(studies)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve studies')
        res.sendStatus(500)
      }
    }
  )

  router.get(
    '/newInvitationCode',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        if (req.user.role !== 'researcher') return res.sendStatus(403)
        const studyCode = await DAL.getNewInvitationCode()
        applogger.info(
          { studyCode: studyCode },
          'Study code sending back from server'
        )
        if (!studyCode) {
          throw new Error('Cannot retrieve study code', studyCode)
        }
        res.json(studyCode)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve study code')
        res.sendStatus(500)
      }
    }
  )

  router.get(
    '/invitationalStudy/:invitationalCode',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const invitationalCode = req.params.invitationalCode
        const study = await DAL.getInvitationalStudy(invitationalCode)
        if (!study) throw new Error('Cannot find study based on code.')
        res.send(study)
      } catch (err) {
        applogger.error({ error: err }, err.message)
        res.sendStatus(404) // TODO: Why can i not send a custom error message if no study exists?
      }
    }
  )

  return router
}
