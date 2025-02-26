/**
 * Sets-up the application.
 * Returns an express app.
 */
import express from 'express'
import helmet from 'helmet'
import passport from 'passport'

import { initLogs, applogger, httplogger } from './services/logger.mjs'
import authConfig from './services/authSetup.mjs'
import getConfig from './services/config.mjs'

const config = getConfig()

import { DAL } from './DAL/DAL.mjs'

import routes from './routes.mjs'

import dataDownload from './routes/dataDownload.mjs'
import formsRouter from './routes/forms.mjs'
import attachmentsRouter from './routes/attachments.mjs'

export default async function () {
  await initLogs()

  const app = express()

  app.use(helmet())

  if (config.loghttp) {
    app.use(httplogger)
  }
  // setup body parser
  // default limit is 100kb, so we need to extend the limit
  // see http://stackoverflow.com/questions/19917401/node-js-express-request-entity-too-large
  app.use(express.urlencoded({ limit: '20mb', extended: false }))
  app.use(express.json({ limit: '20mb' }))
  app.use(express.text({ limit: '20mb' }))

  // this needs to be called by apps, allow CORS for everybody
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'PUT, PATCH, DELETE, GET, POST')
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    )
    next()
  })

  await DAL.init()

  await authConfig()

  app.use(passport.initialize())

  const apiPrefix = '/api'

  app.use(apiPrefix, routes)

  //TODO: refactor these routers into contollers
  app.use(apiPrefix, dataDownload(app))
  app.use(apiPrefix, await formsRouter())
  app.use(apiPrefix, await attachmentsRouter())

  // error handler
  app.use(function (err, req, res, next) {
    applogger.error(err, 'General error')

    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.send('<p>INTERNAL ERROR</p>')
  })

  applogger.info('Starting server')

  return app
}
