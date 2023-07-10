/**
 * This provides the API endpoints for for medical words.
 */
import vocabulary from '../services/vocabulary.mjs'
import express from 'express'
import { applogger } from '../services/logger.mjs'

export default {
  /**
   * Initialises the controller.
   */
  async init () {
  },

  // lang can be 'en' or 'sv'
  // type can be 'substance' or 'disorder'
  // example: /vocabulary/en/disorder/search?term=heart&limit=10
  async getTerm (req, res) {
    try {
      const lang = req.params?.lang
      if (lang !== 'en' && lang !== 'sv' && lang !== 'es') {
        res.sendStatus(400)
        return
      }

      const type = req.params?.type
      if (type !== 'substance' && type !== 'disorder') {
        res.sendStatus(400)
        return
      }

      const term = req.query?.term
      if (!term) {
        res.sendStatus(400)
        return
      }

      let limit = req.query?.limit
      if (!limit) limit = 10 // default limit

      applogger.debug({ term, lang, type, limit }, 'Querying medical term')
      const concepts = await vocabulary.getTerm(term, type, lang, limit)
      res.json(concepts)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot connect to vocabulary API')
      res.sendStatus(500)
    }
  }
}
