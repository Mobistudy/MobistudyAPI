/**
 * This provides the API endpoints for the reseacher.
 */

import express from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'

import { DAL } from '../DAL/DAL.mjs'
import getConfig from '../services/config.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()


export default async function () {
    const config = getConfig()

    router.get(
    '/researchers/:studyKey/',
      passport.authenticate('jwt', { session: false }),
      async function (req, res) {
        try {
          const reseacherKey = req.user._key
          const studyKey = req.params.studyKey
          const preferredParticipans = await DAL.getPreferredParticipans(reseacherKey, studyKey)
          res.send(preferredParticipans ? preferredParticipans.preferredParticipans : [])
        } catch (err) {
          applogger.error(
            { error: err },
            'Cannot retrieve team with _key ' + req.params
          );
          res.sendStatus(500)
        }
      }
    )

    router.post(
    '/researchers/',
      passport.authenticate('jwt', { session: false }),
      async function (req, res) {
          try {
          const { studyKey, userKey  } = req.body
          const researcherKey = req.user._key
          await DAL.setPreferredParticipant(researcherKey, studyKey, userKey.toString())
          res.sendStatus(200)
          } catch (err) {
          applogger.error(
              { error: err },
              'Cannot retrieve team with _key ' + req.params
          );
          res.sendStatus(500)
        }
      }
    )
  return router
}
