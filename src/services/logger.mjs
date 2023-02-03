/**
* Sets-up the loggers.
* Returns two loggers, one for the http raw stuff and one for the application.
*/

import rfs from 'rotating-file-stream'
import pino from 'pino'
import pinohttp from 'pino-http'
import getConfig from './config.mjs'

const config = getConfig()

const HTTPLOG_FILENAME = 'http.log'
const APPLOG_FILENAME = 'app.log'

let pinoapplogger
let applogger = {
  trace (object, message) {
    if (message) {
      console.debug(message, object)
      pinoapplogger.trace(object, message)
    } else {
      console.debug(object)
      pinoapplogger.trace(object)
    }
  },
  debug (object, message) {
    if (message) {
      console.debug(message, object)
      pinoapplogger.debug(object, message)
    } else {
      console.debug(object)
      pinoapplogger.debug(object)
    }
  },
  info (object, message) {
    if (message) {
      console.info(message, object)
      pinoapplogger.info(object, message)
    } else {
      console.info(object)
      pinoapplogger.info(object)
    }
  },
  warn (object, message) {
    if (message) {
      console.warn(message, object)
      pinoapplogger.warn(object, message)
    } else {
      console.warn(object)
      pinoapplogger.warn(object)
    }
  },
  error (object, message) {
    if (message) {
      console.error(message, object)
      pinoapplogger.error(object, message)
    } else {
      console.error(object)
      pinoapplogger.error(object)
    }
  },
  fatal (object, message) {
    if (message) {
      console.error(message, object)
      pinoapplogger.fatal(object, message)
    } else {
      console.error(object)
      pinoapplogger.fatal(object)
    }
  }
}
let httplogger = {}

const initLogs = async function () {
  if (!rfs) throw new Error('Cannot load rotating fle stream')

  const httplogstream = rfs.createStream(HTTPLOG_FILENAME, {
    path: config.logs.folder,
    size: config.logs.rotationsize,
    compress: 'gzip'
  })

  const applogstream = rfs.createStream(APPLOG_FILENAME, {
    path: config.logs.folder,
    size: config.logs.rotationsize,
    compress: 'gzip'
  })

  httplogstream.on('error', console.error)
  httplogstream.on('warning', console.error)

  applogstream.on('error', console.error)
  applogstream.on('warning', console.error)

  httplogger = pinohttp(httplogstream)
  const pinoapplogger = pino(applogstream)

  httplogger.level = config.logs.level
  pinoapplogger.level = config.logs.level

  if (!config.logs.console) {
    // just use the pino version directly
    applogger = pinoapplogger
  }
}

export { initLogs, httplogger, applogger }
