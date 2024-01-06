/**
 * This provides the API endpoints for all tasks results.
 */
import * as Types from '../../models/jsdocs.js'

import { applogger } from '../services/logger.mjs'
import * as environment from '../services/environment.mjs'



export default {

  /**
   * Initialises the controller.
   */
  async init () {
  },

  /**
   * Gets the environment variables
   * @param {Object} req - express request, must include 2 query params: lat and long
   * @param {Object} res - express response
   */
  async getEnvironment (req, res) {
    applogger.debug({ lat, long }, 'Retrieving environment')

    if (this.disabled) return undefined

    let lat = parseFloat(req.query.lat)
    let long = parseFloat(req.query.long)
    let env = {}
    try {
      env.weather = await environment.getWeather(lat, long)
    } catch (err) {
      applogger.error({ err }, 'Cannot retrieve weather')
    }

    try {
      env.location = await environment.getLocation(lat, long)
    } catch (err) {
      applogger.error({ err }, 'Cannot retrieve location')
    }

    try {
      env.pollution = await environment.getPollution(lat, long)
    } catch (err) {
      applogger.error({ err }, 'Cannot retrieve pollution')
    }

    try {
      env.allergens = await environment.getAllergenes(lat, long)
    } catch (err) {
      applogger.error({ err }, 'Cannot retrieve allergens')
    }

    res.send(env)
  }
}
