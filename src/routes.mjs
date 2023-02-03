import passport from 'passport'

import tasksResultsCtrl from './controllers/tasksResultsCtrl.mjs'
import studyStatsCtrl from './controllers/studyStatsCtrl.mjs'

const API_PREFIX = '/api'

// function that sets up the routes
export default async function (app) {
  await tasksResultsCtrl.init()

  app.get(API_PREFIX + '/tasksResults', passport.authenticate('jwt', { session: false }), tasksResultsCtrl.getAll.bind(tasksResultsCtrl))
  app.post(API_PREFIX + '/tasksResults', passport.authenticate('jwt', { session: false }), tasksResultsCtrl.createNew.bind(tasksResultsCtrl))

  await studyStatsCtrl.init()
  app.get(API_PREFIX + '/studyStats/:study_key', passport.authenticate('jwt', { session: false }), studyStatsCtrl.getLastTasksSummary.bind(studyStatsCtrl))
}
