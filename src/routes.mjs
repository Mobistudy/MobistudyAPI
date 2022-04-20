import express from 'express'
import passport from 'passport'

import tasksResults from './controllers/tasksResults.mjs'

const router = express.Router()

const API_PREFIX = '/api'

// function that sets up the routes
export default async function () {
  await tasksResults.init()
  router.get(API_PREFIX + '/tasksResults', passport.authenticate('jwt', { session: false }), tasksResults.getAll)
  router.post(API_PREFIX + '/tasksResults', passport.authenticate('jwt', { session: false }), tasksResults.createNew)
}
