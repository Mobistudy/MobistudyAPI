/**
* This provides the API endpoints for sending files as attachments.
*/

import express from 'express'
import passport from 'passport'
import { getAttachmentWriter } from '../services/attachments.mjs'
import { DAO } from '../DAO/DAO.mjs'

const router = express.Router()

export default async function () {
  // webhook for mSafety data
  router.post('/attachments/:studyKey/:taskId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'participant') return res.sendStatus(403)
    const studyKey = req.params.studyKey
    const taskId = parseInt(req.params.taskId)
    const userKey = req.user._key
    // check that the user participates into the study
    const participant = await DAO.getParticipantByUserKey(userKey)
    if (!participant) return res.sendStatus(404)
    const study = participant.studies.find((s) => {
      return s.studyKey === studyKey
    })
    if (!study) return res.sendStatus(400)
    // check that the task id is OK
    const taskItem = study.taskItemsConsent.find(ti => ti.taskId === taskId)
    if (!taskItem) return res.sendStatus(400)

    // as file id let's use a timestamp
    const ts = new Date().getTime()
    let filename = ts + '.json'
    if (req.query && req.query.filename) {
      // check if it's a valid filename (only alphanumeric, -, _ and . allowed)
      const regex = /^[\w\-. ]+$/
      if (regex.test(req.query.filename)) filename = req.query.filename
    }
    let writer
    try {
      // let's create a writer from the request
      writer = await getAttachmentWriter(userKey, studyKey, taskId, filename)

      const writeStream = writer.getStream()

      // This pipes the POST data to the file
      req.pipe(writeStream)

      // This is here incase any errors occur
      writeStream.on('error', (err) => {
        writer.end()
        res.status(500).send('Cannot save file ' + err)
      })

      req.on('end', async () => {
        await writer.end()
        res.send(filename)
      })
    } catch (err) {
      console.error('Cannot store attachment', err)
      if (writer) writer.end()
      res.status(500).send('Cannot save file ' + err)
    }
  })

  return router
}
