/**
* Mobistudy REST API. This is the main application file.
* This loads the actual application and initalises the environment.
*/
import fs from 'fs'
import http from 'http'
import https from 'https'
import cluster from 'cluster'
import os from 'os'
import getApp from './app.mjs'

(async () => {
  const numCPUs = os.cpus().length
  const app = await getApp()


  // pass parameters down the application
  app.set('port', process.env.WEB_PORT || 8080)

  let server

  if (process.env.WEB_CLUSTER === 'true' && cluster.isPrimary) {
    console.log(`Master process ${process.pid} is running`)

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork()
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`)
    })
  } else {
    if (process.env.CERT_KEY && process.env.CERT_FILE) {
      // HTTPS case

      // Private Key and Public Certificate
      const privateKey = fs.readFileSync(process.env.CERT_KEY, 'utf8')
      const certificate = fs.readFileSync(process.env.CERT_FILE, 'utf8')

      console.log('Using certificates')
      server = https.createServer({ key: privateKey, cert: certificate }, app)
    } else {
      // HTTP case
      server = http.createServer(app)
    }

    // Listen on provided port, on all network interfaces.
    server.listen(process.env.WEB_PORT)
    server.on('error', onError)
    server.on('listening', onListening)

    console.log(`Listening process ${process.pid} started`)
  }

  /**
  * Event listener for HTTP server "error" event.
  */
  function onError (error) {
    if (error.syscall !== 'listen') {
      throw error
    }

    const bind = typeof process.env.WEB_PORT === 'string' ? 'Pipe ' + process.env.WEB_PORT : 'Port ' + process.env.WEB_PORT

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges')
        process.exit(1)
      case 'EADDRINUSE':
        console.error(bind + ' is already in use')
        process.exit(1)
      default:
        throw error
    }
  }

  /**
  * Event listener for HTTP server "listening" event.
  */
  function onListening () {
    const addr = server.address()
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
    console.log('Listening on ' + bind)
  }
})()
