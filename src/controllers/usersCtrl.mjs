/**
* This provides the controllers for authentication and users management.
*/
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import owasp from 'owasp-password-strength-test'
import zxcvbn from 'zxcvbn'
import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import mailSender from '../services/mailSender.mjs'
import { userRegistrationCompose, passwordRecoveryCompose, newPasswordCompose } from '../services/emailComposer.mjs'
import { getLanguageFromAcceptedList } from '../i18n/i18n.mjs'

owasp.config({
  allowPassphrases: true,
  maxLength: 70,
  minLength: 8,
  minPhraseLength: 10,
  minOptionalTestsToPass: 3
})


const pwdCheck = function (email, password) {
  const userName = email.substring(0, email.indexOf('@'))
  if ((password.toUpperCase().includes(userName.toUpperCase()))) return false

  const strengthCheck = zxcvbn(password)
  if (strengthCheck.score < 2) return false

  const result = owasp.test(password)
  if (!result.strong) {
    return false
  }
  return true
}

export default {
  /**
   * Initialises the controller.
   */
  async init () {

  },

  login: function (req, res) {
    res.send(req.user)
    auditLogger.log('login', req.user._key, undefined, undefined, 'User ' + req.user.email + ' has logged in', 'users', req.user._key)
  },

  sendPasswordResetEmail: async function (req, res) {
    if (req.body.email) {
      const email = req.body.email
      const existing = await DAL.findUserByEmail(email)
      if (!existing) return res.sendStatus(200)

      const daysecs = 24 * 60 * 60
      const token = jwt.sign({
        email: email
      }, process.env.AUTH_SECRET, {
        expiresIn: daysecs
      })
      const serverlink = 'https://app.mobistudy.org/#/resetPassword?email=' + email + '&token=' + token
      let language = 'en'
      if (existing.role === 'participant') {
        // find language of the participant
        const part = await DAL.getParticipantByUserKey(existing._key)
        language = part.language
      }
      const msg = passwordRecoveryCompose(serverlink, token, language)
      await mailSender.sendEmail(email, msg.title, msg.content)
      res.sendStatus(200)
      applogger.info({ email: req.body.email }, 'Reset password email sent')
      auditLogger.log('resetPasswordEmail', existing._key, undefined, undefined, 'User ' + email + ' has requested a reset password email', 'users', existing._key)
    } else res.sendStatus(400)
  },

  resetPassword: async function (req, res) {
    if (req.body.token && req.body.password) {
      let decoded
      try {
        decoded = jwt.verify(req.body.token, process.env.AUTH_SECRET)
      } catch (err) {
        applogger.error(err, 'Resetting password, cannot parse token')
        return res.sendStatus(500)
      }
      if (new Date().getTime() >= (decoded.exp * 1000)) {
        applogger.info('Resetting password, token has expired')
        res.sendStatus(400)
      } else {
        const email = decoded.email
        const newPasssword = req.body.password
        if (!pwdCheck(email, newPasssword)) return res.status(400).send('Password too weak')
        const hashedPassword = bcrypt.hashSync(newPasssword, 8)
        const existing = await DAL.findUserByEmail(email)
        if (!existing) {
          applogger.info('Resetting password, email ' + email + ' not registered')
          return res.status(409).send('This email is not registered')
        }
        let language = 'en'
        if (existing.role === 'participant') {
          // find language of the participant
          const part = await DAL.getParticipantByUserKey(existing._key)
          language = part.language
        }
        const msg = newPasswordCompose(language)
        await mailSender.sendEmail(email, msg.title, msg.content)

        await DAL.updateUser(existing._key, {
          hashedPassword: hashedPassword
        })

        res.sendStatus(200)
        applogger.info({ email: email }, 'User has changed the password')
        auditLogger.log('resetPassword', existing._key, undefined, undefined, 'User ' + email + ' has changed the password', 'users', existing._key)
      }
    } else res.sendStatus(400)
  },

  createUser: async (req, res) => {
    if (!req.body.password || !req.body.email || !req.body.role) return res.status(400).send('Need email, role and password')

    const user = req.body

    if (user.role === 'admin') {
      // no admin should ever be registered
      res.sendStatus(403)
      return
    }

    const password = user.password
    if (!pwdCheck(user.email, password)) return res.status(400).send('Password too weak')

    const existing = await DAL.findUserByEmail(user.email)
    if (existing) {
      res.status(409).send('This email is already registered')
      return
    }

    const hashedPassword = bcrypt.hashSync(password, 8)
    delete user.password
    user.hashedPassword = hashedPassword
    try {

      // user can be registered now, we first try to send the email
      // this works also as a partial email address control
      // get the language from the browser, at this stage the user preferences are unknown
      const language = getLanguageFromAcceptedList(req.acceptsLanguages())
      try {
        const msg = userRegistrationCompose(language)
        await mailSender.sendEmail(user.email, msg.title, msg.content)
      } catch (err) {
        res.status(400).send('Cannot send confirmation email')
        applogger.warn({ error: err }, 'Cannot send new user confirmation email')
        return
      }

      user.createdTS = new Date()
      const newuser = await DAL.createUser(user)
      res.sendStatus(200)
      applogger.info({ email: newuser.email }, 'New user created')
      auditLogger.log('userCreated', newuser._key, undefined, undefined, 'New user created with email ' + newuser.email, 'users', newuser._key)

    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new user')
      res.sendStatus(500)
    }
  },

  renewToken: async (req, res) => {
    const user = req.user
    applogger.debug(user.email + ' has requested a new token')

    delete user.token
    delete user.exp
    delete user.iat

    const newToken = jwt.sign(user, process.env.AUTH_SECRET, {
      expiresIn: process.env.AUTH_TOKEN_EXPIRES
    })
    user.token = newToken
    res.send(newToken)
  },

  updateUser: async (req, res) => {
    if (req.user.role === 'researcher') { return res.sendStatus(403) }
    if (req.user.role === 'participant') {
      // participant can only change himself
      if (req.params.userKey !== req.user._key) return res.sendStatus(403)
    }

    const userKey = req.params.userKey

    // the only parameter that can be changed is if the user is a testuser
    // role, email and password cannot be changed

    if (req.body.testUser !== undefined) {
      const isTestUser = req.body.testUser
      const user = await DAL.getOneUser(userKey)
      user.testUser = isTestUser
      user.updatedTS = new Date()
      await DAL.updateUser(userKey, user)
      res.sendStatus(200)
    }
  },

  // query parameters (optional):
  // after: ISO timeStamp
  // before: ISO timeStamp
  // eventType: type of event
  // studyKey
  // taskId
  // userEmail
  // sortDirection: ASC or DESC
  // offset: for pagination
  // count: for pagination
  getUsers: async function (req, res) {
    if (req.user.role !== 'admin') {
      res.sendStatus(403)
    } else {
      try {
        const result = await DAL.getUsers(false,
          req.query.roleType,
          req.query.userEmail,
          req.query.sortDirection,
          req.query.offset,
          req.query.count
        )
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve users')
        res.sendStatus(500)
      }
    }
  },

  getUserByKey: async (req, res) => {
    try {
      let val
      if (req.user.role === 'admin') {
        val = await DAL.getOneUser(req.params.user_key)
      } else if (req.user.role === 'researcher') {
        // TODO: make sure the user Key is among the ones the researcher is allowed. i.e is part of the team key
        val = await DAL.getOneUser(req.params.user_key)
      }
      res.send(val)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve user details')
      res.sendStatus(500)
    }
  },

  // Remove Specified User (currently only removes researchers)
  // TODO: remove participants as well
  removeUser: async function (req, res) {
    try {
      const userKey = req.params.user_key
      // Only admin can remove a team
      if (req.user.role === 'admin') {
        // Remove user from all teams
        const teamsOfUser = await DAL.getAllTeams(userKey)
        // For each team, find the user key in the researcher keys and remove
        for (let i = 0; i < teamsOfUser.length; i++) {
          const teamKeyOfUser = teamsOfUser[i]._key
          const selTeam = await DAL.getOneTeam(teamKeyOfUser)
          const index = selTeam.researchersKeys.indexOf(userKey)
          if (index !== null) {
            selTeam.researchersKeys.splice(index, 1)
          }
          await DAL.replaceTeam(teamKeyOfUser, selTeam)
        }
        // Then, FINALLY, remove user from DAL
        const user = await DAL.getOneUser(userKey)
        await DAL.removeUser(userKey)
        res.sendStatus(200)

        applogger.info({ email: user.email }, 'User deleted')
        auditLogger.log('userDeleted', userKey, undefined, undefined, 'User with email ' + user.email + ' deleted', 'users', userKey)
      } else res.sendStatus(403)
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot delete user with key ' + req.params.user_key)
      res.sendStatus(500)
    }
  }
}
