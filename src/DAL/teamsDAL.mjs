/**
* This provides the data access for teams.
* A use will have basic authentication and data access information:
* {
*   name: 'A-Team',
*   createdTS: 'ISO string',
*   invitationCode: 'long JWT valid for all users',
*   invitationExpiry: 'ISO string',
*   researchersKeys: ['asdasdaasd', 'asdasdasd']
* }
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'teams'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, COLLECTIONNAME)
  collection.ensureIndex({ type: 'persistent', fields: ['researchers[*].userKey'] })
}

const DAL = {
  /**
   * Stores a new team
   * @param {*} newTeam
   * @returns the new team, with added _key
   */
  async createTeam (newTeam) {
    if (!newTeam.createdTS) newTeam.createdTS = new Date()
    if (!newTeam.researchers) newTeam.researchers = []
    let meta = await collection.save(newTeam)
    newTeam._key = meta._key
    return newTeam
  },

  /**
   * Gets one team by its key
   * @param {*} key
   * @returns the found team, else undefined
   */
  async getOneTeam (key) {
    let bindings = { 'key': key }
    var query = 'FOR team in teams FILTER team._key == @key RETURN team'
    applogger.trace(bindings, 'Querying "' + query + '"')
    let cursor = await db.query(query, bindings)
    let teams = await cursor.all()
    if (teams.length) return teams[0]
    else return undefined
  },

  /**
   * Udpates a team with a new one.
   * Assumption: key is the correct one.
   * @param {string} _key
   * @param {*} team
   * @returns
   */
  async replaceTeam (key, team) {
    let meta = await collection.replace(key, team)
    team._key = meta._key
    return team
  },

  /**
   * Finds a team by name
   * @param {string} teamName
   * @returns the team, else undefined
   */
  async findTeam (teamName) {
    let bindings = { 'name': teamName }
    var query = 'FOR team in teams FILTER team.name == @name RETURN team'
    applogger.trace(bindings, 'Querying "' + query + '"')
    let cursor = await db.query(query, bindings)
    let teams = await cursor.all()
    if (teams.length) return teams[0]
    else return undefined
  },

  /**
   * Adds/updates a researcher to a team
   * @param {string} teamKey - key of the team
   * @param {string} researcherKey - user key of the researcher
   * @param {string} studyKey - optional, adds information about the study
   * @param {Array} options - optional, can include preferred participants information
   * @returns a promise that passes the new team
   */
  async addResearcherToTeam (teamKey, researcherKey, studyKey, options) {
    let team = await this.getOneTeam(teamKey)
    if (!team.researchers) team.researchers = []
    // find the researcher if any
    let res = team.researchers.find(r => r.userKey === researcherKey)
    if (!res) {
      res = {
        userKey: researcherKey
      }
      team.researchers.push(res)
    }
    if (studyKey) {
      if (!res.studiesOptions) res.studiesOptions = []
      let studyOption = res.studiesOptions.find(s => s.studyKey === studyKey)
      if (!studyOption) {
        studyOption = {
          studyKey: studyKey
        }
        res.studiesOptions.push(studyOption)
      }

      if (options) Object.assign(studyOption, options)
    }
    return this.replaceTeam(teamKey, team)
  },


  /**
   * Deletes a researcher from a team
   * @param {string} teamKey
   * @param {string} researcherKey
   * @returns a promise with the new team composition
   */
  async removeResearcherFromTeam (teamKey, researcherKey) {
    let team = await this.getOneTeam(teamKey)
    if (!team) return Promise.reject('Team not found')

    // find the researcher
    let resIdx = team.researchers.findIndex(r => r.userKey === researcherKey)
    if (resIdx < 0) {
      return Promise.reject('Researcher not found')
    }
    team.researchers.splice(resIdx, 1)
    return this.replaceTeam(teamKey, team)
  },

  /**
   * Gets all teams, optionally associated to a user (researcher) or study, or both
   * @param {string} userKey - optional, the key of the researcher
   * @param {string} studyKey - optional, the key of the study
   * @param {Function} dataCallback - used to receive data one by one
   * @returns a promise, the teams found is passed, if any, as an array
   */
  async getAllTeams (userKey, studyKey, dataCallback) {
    let query = 'FOR team in teams '
    let bindings = {}

    if (studyKey) {
      query += 'FOR study IN studies '
      bindings.studyKey = studyKey
      query += 'FILTER study.teamKey == team._key AND study._key == @studyKey '
    }
    if (userKey && !studyKey) {
      query += 'FILTER @userKey IN team.researchers[*].userKey  '
      bindings.userKey = userKey
    }
    if (userKey && studyKey) {
      query += 'AND @userKey IN team.researchers[*].userKey  '
      bindings.userKey = userKey
    }

    query += ' RETURN team'
    applogger.trace(bindings, 'Querying "' + query + '"')
    let cursor = await db.query(query, bindings)
    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else return cursor.all()
  },

  // remove a team (Assumption: teamKey is the correct one)
  /**
   * Deletes a team
   * @param {string} teamKey
   * @returns
   */
  async removeTeam (teamKey) {
    let bindings = { 'tKey': teamKey }
    let query = 'REMOVE { _key:@tKey } IN teams'
    applogger.trace(bindings, 'Querying "' + query + '"')
    let cursor = await db.query(query, bindings)
    return cursor.all()
  }
}
export { init, DAL }
