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
            res.send(preferedUsers)
          } catch (err) {
            applogger.error(
              { error: err },
              'Cannot retrieve team with _key ' + req.params
            );
            res.sendStatus(500)
          }
        }
      )

    router.get(
      '/teams/invitationCode/:teamKey',
      passport.authenticate('jwt', { session: false }),
      async function (req, res) {
        if (req.user.role === 'admin') {
          try {
            const teamkey = req.params.teamKey
  
            const team = await DAL.getOneTeam(teamkey)
            if (!team) return res.sendStatus(400)
  
            const weeksecs = 7 * 24 * 60 * 60
            const token = jwt.sign(
              {
                teamKey: teamkey
              },
              config.auth.secret,
              {
                expiresIn: weeksecs
              }
            )
            team.invitationCode = token
            team.invitationExpiry = new Date(
              new Date().getTime() + weeksecs * 1000
            )
            await DAL.replaceTeam(teamkey, team)
            res.send(token)
          } catch (err) {
            applogger.error(
              { error: err },
              'Cannot generate invitation code for team ' + req.params.teamKey
            )
            res.sendStatus(500)
          }
        } else res.sendStatus(403)
      }
    )
  
    // add a researcher to a team
    router.post(
      '/teams/researcher/add',
      passport.authenticate('jwt', { session: false }),
      async function (req, res) {
        const researcherKeyUpdt = req.user._key
        const JToken = req.body.invitationCode
        // Verify the JWT
        try {
          try {
            var decoded = jwt.verify(JToken, config.auth.secret)
          } catch (err) {
            applogger.warn(
              { token: JToken },
              'An invitaiton code for a team has wrong format'
            )
            res.sendStatus(400)
            return
          }
          if (new Date().getTime() >= decoded.exp * 1000) {
            applogger.error('Adding researcher to team, token has expired')
            res.sendStatus(400)
          } else {
            const decodedTeamKey = decoded.teamKey
            const selTeam = await DAL.getOneTeam(decodedTeamKey)
            if (selTeam) {
              if (selTeam.researchersKeys.includes(researcherKeyUpdt)) {
                applogger.error(
                  'Adding researcher to team, researcher already added'
                )
                res.sendStatus(409)
              } else {
                selTeam.researchersKeys.push(researcherKeyUpdt)
                await DAL.replaceTeam(decodedTeamKey, selTeam)
                res.json({ teamName: selTeam.name })
                applogger.info(selTeam, 'Reseacher added to a team')
                auditLogger.log(
                  'researcherAddedToTeam',
                  req.user._key,
                  undefined,
                  undefined,
                  'Researcher with key ' +
                  researcherKeyUpdt +
                  ' added to team ' +
                  selTeam.name,
                  'teams',
                  selTeam._key
                )
              }
            } else {
              applogger.error(
                'Adding researcher to team, team with key ' +
                decodedTeamKey +
                ' does not exist'
              )
              res.sendStatus(400)
            }
          }
        } catch (err) {
          // respond to request with error
          applogger.error({ error: err }, 'Cannot add researcher to team')
          res.sendStatus(500)
        }
      }
    )
    return router
}