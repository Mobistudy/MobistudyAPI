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
            const preferedUsers = await DAL.getStudyPreferences(reseacherKey, studyKey)
            res.send(preferedUsers.preferedPatients)
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
        const researcherKey = req.user._key
        const studyKey = req.body.studyKey
        const userKey = req.body.userKey

        console.log(researcherKey, studyKey, userKey);

        const existingPreferedUser = await DAL.getIfPatientAlreadyInPreferences(researcherKey, studyKey, userKey)

        if (!existingPreferedUser) {
          await DAL.addPreferedPatient(researcherKey, studyKey, userKey)
        } else {console.log('Patient is already in prefered patients')}
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