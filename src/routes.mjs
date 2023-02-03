import passport from 'passport'

import tasksResults from './controllers/tasksResults.mjs'
import studiesStatsCtrl from './controllers/tasksResultsCtrl.mjs'

const API_PREFIX = '/api'

// function that sets up the routes
export default async function (app) {
  await tasksResults.init()

  app.get(API_PREFIX + '/tasksResults', passport.authenticate('jwt', { session: false }), tasksResults.getAll.bind(tasksResults))
  app.post(API_PREFIX + '/tasksResults', passport.authenticate('jwt', { session: false }), tasksResults.createNew.bind(tasksResults))
  await studiesStatsCtrl.init()
  app.post(API_PREFIX + '/studyStats/:study_key', passport.authenticate('jwt', { session: false }), studiesStatsCtrl.createNew.bind(studiesStatsCtrl))
}
