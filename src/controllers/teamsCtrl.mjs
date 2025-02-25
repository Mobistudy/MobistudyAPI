/**
 * This provides the API endpoints for the teams.
 */
import getConfig from '../services/config.mjs'
import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import jwt from 'jsonwebtoken'
import { readFile } from 'fs/promises'
import Ajv from 'ajv'


export default {
  /**
   * Json schema validate function
   */
  validate: null,

  /**
   * Secret used for the JWT tokens
   */
  JWTSecret: null,

  /**
   * Initialises the controller.
   */
  async init () {
    this.JWTSecret = getConfig().auth.secret

    const teamSchema = JSON.parse(
      await readFile('./models/team.json')
    )
    const ajv = new Ajv({
      schemas: [teamSchema]
    })
    this.validate = ajv.getSchema('https://mobistudy.org/models/team.json')
  },

  /**
   * Creates a new team
   * @param {object} req - express request object
   * @param {object} res - express response object
   * @returns a promise
   */
  async createTeam (req, res) {
    if (req.user.role === 'admin') {
      let newteam = req.body
      const valid = this.validate(newteam)
      if (!valid) {
        applogger.error({ errors: this.validate.errors, input: newTasksResults }, 'Team does not validate against schema')
        return res.status(400).send('Team does not validate against schema')
      }

      if (!newteam.createdTS) newteam.createdTS = new Date()
      if (!newteam.researchers) newteam.researchers = []
      try {
        const existingTeam = await DAL.findTeam(newteam.name)
        if (existingTeam) return res.sendStatus(409)
        newteam = await DAL.createTeam(newteam)
        res.send(newteam)
        applogger.info(newteam, 'New team created')
        auditLogger.log(
          'teamCreated',
          req.user._key,
          undefined,
          undefined,
          'New team created ' + newteam.name,
          'teams',
          newteam._key
        )
      } catch (err) {
        applogger.error({ error: err }, 'Cannot store new study')
        res.sendStatus(500)
      }
    } else res.sendStatus(403)
  },

  /**
  * Generates a code for adding a researcher to the team
  * @param {object} req - express request object
  * @param {object} res - express response object
  * @returns a promise
  */
  async generateInvitationCode (req, res) {
    if (req.user.role === 'admin') {
      try {
        const teamkey = req.params.teamKey

        const team = await DAL.getOneTeam(teamkey)
        if (!team) return res.sendStatus(400)

        const weeksecs = 7 * 24 * 60 * 60
        const token = jwt.sign(
          {
            teamKey: teamkey
          },
          this.JWTSecret,
          {
            expiresIn: weeksecs
          }
        )
        team.invitationCode = token
        team.invitationExpiry = new Date(
          new Date().getTime() + weeksecs * 1000
        )
        await DAL.replaceTeam(teamkey, team)
        res.send(token)
      } catch (err) {
        applogger.error(
          { error: err },
          'Cannot generate invitation code for team ' + req.params.teamKey
        )
        res.sendStatus(500)
      }
    } else res.sendStatus(403)
  },

  /**
   * Get all teams
   * @param {object} req - express request object
   * @param {object} res - express response object
   * @returns a promise
   */
  async getAll (req, res) {
    try {
      if (req.user.role === 'admin') {
        let teams = await DAL.getAllTeams()
        res.send(teams)
      } else if (req.user.role === 'researcher') {
        let teams = await DAL.getAllTeams(req.user._key)
        res.send(teams)
      } else return res.sendStatus(403)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve teams')
      res.sendStatus(500)
    }
  },

  /**
   * Get one team given its key
   * @param {object} req - express request object
   * @param {object} res - express response object
   * @returns a promise
   */
  async getTeamByKey (req, res) {
    try {
      let team
      if (req.user.role === 'admin') {
        team = await DAL.getOneTeam(req.params.teamKey)
        res.send(team)
      } else if (req.user.role === 'researcher') {
        team = await DAL.getOneTeam(req.params.teamKey)
        if (team.researchers.find(({ userKey }) => userKey === req.user._key)) res.send(team)
        else res.sendStatus(403)
      } else res.sendStatus(403)
    } catch (err) {
      applogger.error(
        { error: err },
        'Cannot retrieve team with _key ' + req.params.teamKey
      )
      res.sendStatus(500)
    }
  },

  /**
   * Adds a researcher to a team
   * @param {object} req - express request object
   * @param {object} res - express response object
   * @returns a promise
   */
  async addResearcherToTeam (req, res) {
    const researcherKeyUpdt = req.user._key
    const JToken = req.body.invitationCode
    // Verify the JWT
    try {
      try {
        var decoded = jwt.verify(JToken, this.JWTSecret)
      } catch (err) {
        applogger.warn(
          { token: JToken },
          'An invitaiton code for a team has wrong format'
        )
        res.sendStatus(400)
        return
      }
      if (new Date().getTime() >= decoded.exp * 1000) {
        applogger.info('Adding researcher to team, token has expired')
        res.sendStatus(400)
      } else {
        const decodedTeamKey = decoded.teamKey
        const selTeam = await DAL.getOneTeam(decodedTeamKey)
        if (selTeam) {
          if (selTeam.researchers && selTeam.researchers.find(r => r.userKey === researcherKeyUpdt)) {
            applogger.warn('Adding researcher to team, researcher already added')
            res.sendStatus(409)
          } else {
            await DAL.addResearcherToTeam(decodedTeamKey, researcherKeyUpdt)
            res.json({ teamName: selTeam.name })
            applogger.info(selTeam, 'Reseacher added to a team')
            auditLogger.log(
              'researcherAddedToTeam',
              req.user._key,
              undefined,
              undefined,
              'Researcher with key ' +
              researcherKeyUpdt +
              ' added to team ' +
              selTeam.name,
              'teams',
              selTeam._key
            )
          }
        } else {
          applogger.error(
            'Adding researcher to team, team with key ' +
            decodedTeamKey +
            ' does not exist'
          )
          res.sendStatus(400)
        }
      }
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot add researcher to team')
      res.sendStatus(500)
    }
  },

  /**
   * Update study options in a team
   * @param {object} req - express request object, must contain logged in user,
   * query params: teamKey and studyKey, body: studiesOptions for that study, typically the array preferredParticipantsKeys
   * @param {object} res - express response object, sends back just 200
   * @returns a promise
   */
  async updateResearcherStudyOptionsInTeam (req, res) {
    try {
      const userKey = req.user._key
      const teamKey = req.params.teamKey
      const studyKey = req.params.studyKey
      const studyOption = req.body

      // TODO: validate https://mobistudy.org/models/team.json/#/$defs/studyOptions

      const selTeam = await DAL.getOneTeam(teamKey)
      if (selTeam) {
        if (!selTeam.researchers || !selTeam.researchers.find(r => r.userKey === userKey)) {
          applogger.warn('Cannot change study options in a team the researcher is not part of')
          res.sendStatus(403)
          return
        }
        await DAL.addResearcherToTeam(teamKey, userKey, studyKey, studyOption)
        res.sendStatus(200)
        applogger.info(selTeam, 'Reseacher changed study option in a team')
        auditLogger.log(
          'researcherUpdateStudyOptionsInTeam',
          req.user._key,
          undefined,
          undefined,
          'Researcher with key ' +
          userKey +
          ' changed study options for study' +
          + studyKey +
          ' in team ' +
          selTeam.name,
          'teams',
          selTeam._key
        )
      } else {
        applogger.error(
          'Adding researcher to team, team with key ' +
          decodedTeamKey +
          ' does not exist'
        )
        res.sendStatus(400)
      }
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot add researcher to team')
      res.sendStatus(500)
    }
  },


  /**
   * Change preferred status of patient in researchers study options in a team
   * @param {object} req - express request object, must contain logged in user,
   * query params: studyKey and participantUserKey, body: { isPreferred: true / false }
   * @param {object} res - express response object, sends back just 200
   * @returns a promise
   */
  async updateResearcherPreferredParticipantInTeam (req, res) {
    try {
      const userKey = req.user._key
      const studyKey = req.params.studyKey
      const participantUserKey = req.params.participantUserKey
      const { isPreferred } = req.body

      // derive team from study
      let sutdyDescr = await DAL.getStudyByKey(studyKey)
      let teamKey = sutdyDescr.teamKey
      // check that the researcher is in the team
      const selTeam = await DAL.getOneTeam(teamKey)
      if (selTeam) {
        if (!selTeam.researchers) selTeam.researchers = []
        let researcherOpts = selTeam.researchers.find(r => r.userKey === userKey)
        if (!researcherOpts) {
          applogger.warn('Cannot change study options in a team the researcher is not part of')
          res.sendStatus(403)
          return
        }
        if (!researcherOpts.studiesOptions) researcherOpts.studiesOptions = []
        let studyOpt = researcherOpts.studiesOptions.find(so => so.studyKey === studyKey)
        if (!studyOpt) {
          const len = researcherOpts.studiesOptions.push({
            preferredParticipantsKeys: []
          })
          studyOpt = researcherOpts.studiesOptions[len - 1]
        }
        if (!studyOpt.preferredParticipantsKeys) studyOpt.preferredParticipantsKeys = []
        const partIdx = studyOpt.preferredParticipantsKeys.indexOf(participantUserKey)
        if (partIdx > -1) {
          if (!isPreferred) {
            // participant is not preferred, but is among preferred, remove
            studyOpt.preferredParticipantsKeys.splice(partIdx, 1)
          } // else is preferred and in the list, leave as is
        } else {
          if (isPreferred) {
            // participant is preferred, but is not in the list, add
            studyOpt.preferredParticipantsKeys.push(participantUserKey)
          } // else is not preferred and not in the list, leave as is
        }
        await DAL.addResearcherToTeam(teamKey, userKey, studyKey, studyOpt)
        res.sendStatus(200)
        applogger.info(selTeam, 'Reseacher changed study option in a team')
        auditLogger.log(
          'researcherUpdateStudyOptionsInTeam',
          req.user._key,
          undefined,
          undefined,
          'Researcher with key ' +
          userKey +
          ' changed study options for study' +
          + studyKey +
          ' in team ' +
          selTeam.name,
          'teams',
          selTeam._key
        )
      } else {
        applogger.error(
          'Adding researcher to team, team with key ' +
          decodedTeamKey +
          ' does not exist'
        )
        res.sendStatus(400)
      }
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot add researcher to team')
      res.sendStatus(500)
    }
  },

  /**
   * Removes a researcher from a team
   * @param {object} req - express request object
   * @param {object} res - express response object
   * @returns a promise
   */
  async removeResearcherFromTeam (req, res) {
    const teamKey = req.body.userRemoved.teamKey
    const userKey = req.body.userRemoved.userKey
    if (req.user.role === 'admin') {
      try {
        await DAL.removeResearcherFromTeam(teamKey, userKey)
        res.sendStatus(200)
        applogger.info(selTeam, 'Reseacher removed from team')
        auditLogger.log(
          'researcherRemovedFromTeam',
          req.user._key,
          undefined,
          undefined,
          'Researcher with key ' +
          userKey +
          ' removed from team ' +
          selTeam.name,
          'teams',
          selTeam._key
        )
      } catch (err) {
        applogger.error({ error: err }, 'Cannot remove user from study')
        res.sendStatus(400)
      }
    } else res.sendStatus(403)
  },

  async deleteTeam (req, res) {
    // TODO: only a draft, to be completed
    try {
      // Only admin can remove a team
      if (req.user.role === 'admin') {
        const teamkey = req.params.teamKey
        // look for studies of that team
        const teamStudies = await DAL.getAllTeamStudies(teamkey)
        let participantsByStudy = []
        // Get list of participants per study. Then delete each study.
        for (let i = 0; i < teamStudies.length; i++) {
          participantsByStudy = await DAL.getParticipantsByStudy(teamStudies[i]._key)
          for (let j = 0; j < participantsByStudy.length; j++) {
            // Per participant, remove the study
            const partKey = participantsByStudy[j]._key
            const participant = await DAL.getOneParticipant(partKey)
            let studyArray = participant.studies
            studyArray = studyArray.filter(
              (study) => study.studyKey !== teamStudies[i]._key
            )
            participant.studies = studyArray
            await DAL.replaceParticipant(partKey, participant)
          }
          await DAL.deleteAnswersByStudy(teamStudies[i]._key)
          await DAL.deleteHealthStoreByStudy(teamStudies[i]._key)
          await DAL.deleteQCSTDataByStudy(teamStudies[i]._key)
          await DAL.deleteSmwtByStudy(teamStudies[i]._key)
          await DAL.deleteMiband3DataByStudy(teamStudies[i]._key)
          await DAL.deletePO60DataByStudy(teamStudies[i]._key)
          await DAL.deletePeakFlowDataByStudy(teamStudies[i]._key)
          await DAL.deletePositionsByStudy(teamStudies[i]._key)
          await DAL.deleteFingerTappingsByStudy(teamStudies[i]._key)
          await DAL.deleteTugtByStudy(teamStudies[i]._key)
          await DAL.deleteHoldPhoneByStudy(teamStudies[i]._key)

          // Delete the study
          await DAL.deleteStudy(teamStudies[i]._key)
        }
        await DAL.removeTeam(teamkey)
        res.sendStatus(200)
        applogger.info({ teamKey: teamkey }, 'Team deleted')
        auditLogger.log(
          'teamDeleted',
          req.user._key,
          undefined,
          undefined,
          'Team with key ' + teamkey + ' deleted',
          'teams',
          teamkey
        )
      } else res.sendStatus(403)
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot delete team ')
      res.sendStatus(500)
    }
  }
}
