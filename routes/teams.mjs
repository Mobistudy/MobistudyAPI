'use strict'

/**
* This provides the API endpoints for the teams.
*/

import express from 'express'
import passport from 'passport'
import getDB from '../DB/DB'
import jwt from 'jsonwebtoken'

import getConfig from '../config'
import { applogger } from '../logger'

const router = express.Router()

export default async function () {
  var db = await getDB()
  var config = getConfig()

  router.get('/teams', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let teams
      if (req.user.role === 'admin') {
        teams = await db.getAllTeams()
      } else if (req.user.role === 'researcher') {
        teams = await db.getAllTeams(req.user._key)
      } else return res.sendStatus(403)
      res.send(teams)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve teams')
      res.sendStatus(500)
    }
  })

  router.get('/teams/:team_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let team
      if (req.user.role === 'admin') {
        team = await db.getOneTeam(req.params.team_key)
        res.send(team)
      } else if (req.user.role === 'researcher') {
        team = await db.getOneTeam(req.params.team_key)
        if (team.researchersKeys.includes(req.user._key)) res.send(team)
        else res.sendStatus(403)
      } else res.sendStatus(403)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve team with _key ' + req.params.team_key)
      res.sendStatus(500)
    }
  })

  router.post('/teams', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role === 'admin') {
      let newteam = req.body
      newteam.createdTS = new Date()
      newteam.researchersKeys = []
      try {
        let existingTeam = await db.findTeam(newteam.name)
        if (existingTeam) return res.sendStatus(409)
        newteam = await db.createTeam(newteam)
        res.send(newteam)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot store new study')
        res.sendStatus(500)
      }
    } else res.sendStatus(403)
  })

  router.get('/teams/invitationCode/:teamKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role === 'admin') {
      try {
        let teamkey = req.params.teamKey

        let team = await db.getOneTeam(teamkey)
        if (!team) return res.sendStatus(400)

        let weeksecs = 7 * 24 * 60 * 60
        const token = jwt.sign({
          teamKey: teamkey
        }, config.auth.secret, {
          expiresIn: weeksecs
        })
        team.invitationCode = token
        team.invitationExpiry = new Date(new Date().getTime() + (weeksecs * 1000))
        await db.updateTeam(teamkey, team)
        res.send(token)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot generate invitation code for team ' + req.params.teamKey)
        res.sendStatus(500)
      }
    } else res.sendStatus(403)
  })

  router.post('/teams/addResearcher', passport.authenticate('jwt', { session: false }), async function (req, res) {
    // TODO: to be completed, use the JWT token
    // {
    //   researcherKey: '12132',
    //   invitationCode: 'asadsd'
    // }
    let newstudy = req.body
    newstudy.updated = new Date()
    try {
      // TODO: do some access control
      newstudy = await db.updateStudy(req.params.study_key, newstudy)
      res.send(newstudy)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot update study with _key ' + req.params.study_key)
      res.sendStatus(500)
    }
  })

  return router
}
