/**
* Sets-up the loggers.
* Returns two loggers, one for the http raw stuff and one for the application.
*/

import rfs from 'rotating-file-stream'
import pino from 'pino'
import pinohttp from 'pino-http'


const HTTPLOG_FILENAME = 'http.log'
const APPLOG_FILENAME = 'app.log'

let pinoapplogger
let applogger = {
  trace (object, message) {
    if (message) {
      console.debug('TRACE: ' + message, object)
      pinoapplogger.trace(object, message)
    } else {
      console.debug('TRACE: ' + object)
      pinoapplogger.trace(object)
    }
  },
  debug (object, message) {
    if (message) {
      console.debug('DEBUG: ' + message, object)
      pinoapplogger.debug(object, message)
    } else {
      console.debug('DEBUG: ' + object)
      pinoapplogger.debug(object)
    }
  },
  info (object, message) {
    if (message) {
      console.info('INFO: ' + message, object)
      pinoapplogger.info(object, message)
    } else {
      console.info('INFO: ' + object)
      pinoapplogger.info(object)
    }
  },
  warn (object, message) {
    if (message) {
      console.warn('WARN: ' + message, object)
      pinoapplogger.warn(object, message)
    } else {
      console.warn('WARN: ' + object)
      pinoapplogger.warn(object)
    }
  },
  error (object, message) {
    if (message) {
      console.error('ERR: ' + message, object)
      pinoapplogger.error(object, message)
    } else {
      console.error('ERR: ' + object)
      pinoapplogger.error(object)
    }
  },
  fatal (object, message) {
    if (message) {
      console.error('FATAL: ' + message, object)
      pinoapplogger.fatal(object, message)
    } else {
      console.error('FATAL: ' + object)
      pinoapplogger.fatal(object)
    }
  }
}
let httplogger = {}

const initLogs = async function () {
  if (!rfs) throw new Error('Cannot load rotating fle stream')

  if (process.env.LOGHTTP === 'true') {
    const httplogstream = rfs.createStream(HTTPLOG_FILENAME, {
      path: process.env.LOGS_FOLDER || './logs',
      size: process.env.LOGS_ROTATIONSIZE || '1M',
      compress: 'gzip'
    })

    httplogstream.on('error', console.error)
    httplogstream.on('warning', console.error)

    httplogger = pinohttp(httplogstream, {
      redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization'],
      }
    })
    httplogger.level = process.env.LOGS_LEVEL || '30'
  }

  const applogstream = rfs.createStream(APPLOG_FILENAME, {
    path: process.env.LOGS_FOLDER || './logs',
    size: process.env.LOGS_ROTATIONSIZE || '1M',
    compress: 'gzip'
  })

  applogstream.on('error', console.error)
  applogstream.on('warning', console.error)

  pinoapplogger = pino(applogstream)
  pinoapplogger.level = parseInt(process.env.LOGS_LEVEL)

  if (!process.env.LOGS_CONSOLE) {
    // just use the pino version directly
    applogger = pinoapplogger
  }
}

export { initLogs, httplogger, applogger }
