import express from 'express'
import passport from 'passport'

import fingerTapping from './controllers/tasksResults.mjs'

const router = express.Router()

const API_PREFIX = '/api'

// function that sets up the routes
export default function () {
  router.get(API_PREFIX + '/fingerTapping', passport.authenticate('jwt', { session: false }), fingerTapping.getAll)
  router.post(API_PREFIX + '/fingerTapping', passport.authenticate('jwt', { session: false }), fingerTapping.createNew)
}
