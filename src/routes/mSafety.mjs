'use strict'
/**
* This provides the API endpoints for the Sony mSafety integration.
*/

import express from 'express'
import { open as fsOpen, stat as fsStat, mkdir as fsMkdir } from 'fs/promises'
import { applogger } from '../services/logger.mjs'
import getConfig from '../services/config.mjs'
import { KeyPair, HandshakeState, CipherState } from '../services/msafetyCrypto.mjs'

const router = express.Router()
const UPLOADSDIR = 'tasksuploads'
const MSAFETYSUBDIR = 'msafety'
const msafetyDir = UPLOADSDIR + '/' + MSAFETYSUBDIR + '/'

const config = getConfig()
const KEYPAIR = new KeyPair(Buffer.from(config.mSafety.publicKey, 'base64'), Buffer.from(config.mSafety.privateKey, 'base64'))

// mem storage for device sessions. For high volume it should be implemented on database instead.
const sessionsStore = {}

/**
 * Stores the content of the CipherStates to the data store.
 *
 * Keeps only keysToSave number of rx keys.
 *
 * @param {String} deviceId a device id.
 * @param {CipherState} rx a CipherState used for incoming messages.
 * @param {CipherState} tx a CipherState used for outgoing messages.
 */
async function storeSession (deviceId, rx, tx) {
  const key = 'state_' + deviceId
  let session = sessionsStore[key]

  if (session) {
    session.tx.key = tx.k.toString('base64')
    session.tx.nonce = tx.n
    session.rx.unshift({ key: rx.k.toString('base64') })

    if (session.rx.length > 3) {
      session.rx.pop()
    }
  } else {
    session = {
      tx: {
        key: tx.k.toString('base64'),
        nonce: tx.n
      },
      rx: [
        {
          key: rx.k.toString('base64')
        }
      ]
    }
  }
  sessionsStore[key] = session
}

/**
 * Loads the session for the device id.
 *
 * @param {string} deviceId the device id.
 * @returns {Object} if a session exists. null otherwise.
 */
async function loadSession (deviceId) {
  const key = 'state_' + deviceId
  return sessionsStore[key]
}

/**
 * Updates a session.
 * @param {string} deviceId the device id.
 * @param {Object} session the session object.
 */
async function updateSession (deviceId, session) {
  const key = 'state_' + deviceId
  sessionsStore[key] = session
}

/**
 * Executes the responders part of the NK pattern and stores the cipher states to the underlying data store.
 *
 * @param {String} ciphertext the ciphertext.
 * @param {String} deviceId the id of the device.
 * @return {object} an object containing the message as base64 encoded string.
 */
function keyexchange (ciphertext, deviceId) {
  console.log('CIPHERTEXT', ciphertext)
  console.log('DEVICEID', deviceId)

  const [message, rx, tx] = handshake(ciphertext)
  console.log('handshake message', message)
  console.log('handshake rx', rx)
  console.log('handshake tx', tx)

  storeSession(deviceId, rx, tx)

  return { data: message.toString('base64') }
}

/**
 * Executes a handshake using NK pattern. The ciphertext is a base64 message from the initiator.
 *
 * @param {String} ciphertext a base64 encoded string from the initiator.
 * @return an array containing a message and the two cipher states.
 */
function handshake (ciphertext) {
  const handshakeState = new HandshakeState()
  handshakeState.Initialize('NK', false, Buffer.alloc(0), KEYPAIR, null, null, null)

  console.log('handshake HANDSHAKETEST', handshakeState)

  handshakeState.ReadMessage(Buffer.from(ciphertext, 'base64'))
  const response = handshakeState.WriteMessage(Buffer.alloc(0))

  console.log('handshake RESPONSE FROM HANDSHAKE', response)

  return response
}

/**
 * Encrypts plaintext.
 * The key and nonce is loaded from the data store using the device id.
 *
 * @param {String} plaintext the plaintext as a base64 encode string.
 * @param {String} deviceId the device id.
 * @returns an object containing the plaintext (as a base64 encoded string) and the nonce (as a string) used. If anything fails, null is returned.
 */
async function encrypt (plaintext, deviceId) {
  const session = await loadSession(deviceId)

  if (!session) {
    return null
  }

  const cipherState = new CipherState()
  cipherState.InitializeKey(Buffer.from(session.tx.key, 'base64'))
  cipherState.SetNonce(session.tx.nonce)

  try {
    const ciphertext = cipherState.EncryptWithAd(Buffer.alloc(0), Buffer.from(plaintext, 'base64'))

    session.tx.nonce = cipherState.n
    updateSession(deviceId, session)

    return { ciphertext: ciphertext.toString('base64'), nonce: (cipherState.n - BigInt(1)).toString() }
  } catch (error) {
    return null
  }
}

/**
 * Decrypts the ciphertext using the nonce.
 * The key is loaded from the data store using the device id.
 *
 * @param {String} ciphertext a base64 encoded String.
 * @param {BitInt} nonce the nonce used when encrypting the ciphertext.
 * @param {*} deviceId the device id.
 */
async function decrypt (ciphertext, nonce, deviceId) {
  const session = await loadSession(deviceId)

  if (!session) {
    return null
  }

  const cipherState = new CipherState()
  const numberOfKeys = session.rx.length

  for (let i = 0; i < numberOfKeys; i++) {
    const rx = session.rx[i]
    cipherState.InitializeKey(Buffer.from(rx.key, 'base64'))
    cipherState.SetNonce(nonce)

    try {
      const plaintext = cipherState.DecryptWithAd(Buffer.alloc(0), Buffer.from(ciphertext, 'base64'))

      return plaintext.toString()
    } catch (error) {
      if (i === numberOfKeys - 1) {
        return null
      } else {
        continue
      }
    }
  }
}

export default async function () {
  // create the msafety subfolder
  try {
    await fsStat(msafetyDir)
  } catch (err) {
    fsMkdir(msafetyDir, { recursive: true })
  }

  // webhook for mSafety data
  router.post('/msafety/webhook/', async function (req, res) {
    // temporary implementation, just writes any message to file
    const ts = new Date().getTime()
    let filehandle
    // parse the data and check the auth code
    if (req.headers.authkey === config.mSafety.webhookAuthKey) {
      if (req.body && req.body.pubDataItems) {
        for (const pubdata of req.body.pubDataItems) {
          if (pubdata.type === 'device' && (pubdata.event === 'sensors' || pubdata.event === 'encrypted-data/sensors')) {
            const deviceId = pubdata.deviceId

            // create the device-specific subfolder
            const deviceDir = msafetyDir + deviceId + '/'
            try {
              await fsStat(deviceDir)
            } catch (err) {
              fsMkdir(deviceDir, { recursive: true })
            }

            if (deviceId) {
              const filename = 'sensor_' + ts + '.json'
              let sensordata = pubdata.jsonData

              if (pubdata.event === 'encrypted-data/sensors') {
                const ciphertext = sensordata.data
                const nonce = sensordata.nonce

                if (!ciphertext) {
                  applogger.warn({ pubdata: pubdata }, 'encrypted data was not passed in the message')
                  res.sendS(400).send('encrypted data was not passed in the message')
                  return
                }
                if (!nonce) {
                  console.warn('missing or univalid nonce')
                  res.status(400).send('nonce was not passed in the message')
                  return
                }

                const plaintext = await decrypt(
                  ciphertext,
                  BigInt(nonce),
                  deviceId
                )

                if (plaintext) {
                  console.log('Data decrypted', plaintext)
                  sensordata = plaintext
                } else {
                  console.warn({ ciphertext, nonce }, 'could not decrypt data')
                  res.status(400).send('could not decrypt data')
                  return
                }
              }
              try {
                filehandle = await fsOpen(deviceDir + filename, 'w')
                const text = JSON.stringify(sensordata)
                await filehandle.writeFile(text)
                applogger.debug({ filename: filename }, 'mSafety file with data saved')
              } catch (err) {
                applogger.error({ error: err }, 'cannot save sensors data mSafety file: ' + filename)
                res.sendStatus(500)
                return
              } finally {
                if (filehandle) await filehandle.close()
              }
            } else {
              applogger.warn({ pubdata: pubdata }, 'discarding sensor data with absent deviceid')
              res.status(400).send('no deviceid passed')
              return
            }
          } else {
            applogger.trace({ pubdata: pubdata }, 'discarding non sensors data from mSafety')
          }
        }
        res.sendStatus(200)
      } else {
        const filename = 'request_' + ts + '.txt'
        applogger.debug({ headers: req.headers, body: req.body }, 'mSafety strange packet received, storing it raw on ' + filename)
        try {
          filehandle = await fsOpen(msafetyDir + filename, 'w')
          const text = JSON.stringify({
            headers: req.headers,
            body: req.body
          })
          await filehandle.writeFile(text)
          res.sendStatus(200)
        } catch (err) {
          res.sendStatus(500)
          applogger.error({ error: err }, 'cannot save mSafety raw file' + filename)
        } finally {
          if (filehandle) await filehandle.close()
        }
      }
    } else {
      res.sendStatus(403)
      applogger.warn({ headers: req.headers, body: req.body }, 'mSafety unauthorized call received')
    }
  })

  // key exchange protocol
  router.post('/msafety/keyexchange/', async function (req, res) {
    const body = req.body
    applogger.trace({ body: body }, 'msafety key exchange request')

    if (!body || !body.data) {
      applogger.warn('mSafety key exchange request without any body')
      res.status(400).send('data was not passed in the post body')
      return
    }
    const ciphertext = body.data
    const deviceId = req.query.deviceId

    if (!deviceId) {
      applogger.warn('mSafety key exchange request without deviceId in query params')
      res.status(400).send('deviceId was not passed in query params')
      return
    }

    try {
      const response = keyexchange(ciphertext, deviceId)
      res.send(response)
      applogger.debug('mSafety key exchange completed for device ' + deviceId)
    } catch (err) {
      applogger.error({ error: err }, 'cannot generate mSafety key exchange')
      res.sendStatus(500)
    }
  })

  return router
}
