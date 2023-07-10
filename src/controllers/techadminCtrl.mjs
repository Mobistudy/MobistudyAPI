/**
 * This provides the API endpoints for technical administration and tests.
 */
import mailSender from '../services/mailSender.mjs'

export default {
  /**
   * Initialises the controller.
   */
  async init () {
  },


  /**
   * Sends a single email, address, subject and content should be part of the body in a json
   * @param {object} req
   * @param {object} res
   */
  async sendOneEmail (req, res) {
    if (req.user.role !== 'admin') {
      res.sendStatus(403)
    } else {
      try {
        await mailSender.sendEmail(req.body.address, req.body.subject, req.body.content)
        res.sendStatus(200)
      } catch (error) {
        res.status(500).send(error)
      }
    }
  }
}
