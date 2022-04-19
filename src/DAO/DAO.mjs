/**
 * This module abstracts the whole DB with functions (a DAO).
 */
import Database from 'arangojs'
import getConfig from '../services/config.mjs'

import getStudiesDAO from './studiesDAO.mjs'
import getFormsDAO from './formsDAO.mjs'
import getUsersDAO from './usersDAO.mjs'
import getAuditLogDAO from './auditLogDAO.mjs'
import getAnswersDAO from './answersDAO.mjs'
import getTeamsDAO from './teamsDAO.mjs'
import getParticipantsDAO from './participantsDAO.mjs'
import getHealthStoreDataDAO from './healthStoreDataDAO.mjs'
import getSmwtsDAO from './smwtsDAO.mjs'
import getQCSTDataDAO from './QCSTDataDAO.mjs'
import getMiband3DataDAO from './miband3DataDAO.mjs'
import getPO60DataDAO from './po60DataDAO.mjs'
import getPeakFlowDataDAO from './peakflowDataDAO.mjs'
import getPositionsDAO from './positionsDAO.mjs'

import getTasksResultsDAO from './tasksResultsDAO.mjs'

export const DAO = {
  db: null,

  async startTransaction (names) {
    return this.db.beginTransaction({
      write: names
    })
  },

  async endTransaction (transaction) {
    return transaction.commit()
  },

  async abortTransaction (transaction) {
    if (transaction) return transaction.abort()
  },

  async initAfterConnection () {
    const studies = await getStudiesDAO(this.db)
    for (const property in studies) {
      this[property] = studies[property]
    }

    const forms = await getFormsDAO(this.db)
    for (const property in forms) {
      this[property] = forms[property]
    }

    const users = await getUsersDAO(this.db)
    for (const property in users) {
      this[property] = users[property]
    }

    const answers = await getAnswersDAO(this.db)
    for (const property in answers) {
      this[property] = answers[property]
    }

    const teams = await getTeamsDAO(this.db)
    for (const property in teams) {
      this[property] = teams[property]
    }

    const participants = await getParticipantsDAO(this.db)
    for (const property in participants) {
      this[property] = participants[property]
    }

    const auditLog = await getAuditLogDAO(this.db)
    for (const property in auditLog) {
      this[property] = auditLog[property]
    }

    const healthStoreData = await getHealthStoreDataDAO(this.db)
    for (const property in healthStoreData) {
      this[property] = healthStoreData[property]
    }

    const SMWTData = await getSmwtsDAO(this.db)
    for (const property in SMWTData) {
      this[property] = SMWTData[property]
    }

    const QCSTData = await getQCSTDataDAO(this.db)
    for (const property in QCSTData) {
      this[property] = QCSTData[property]
    }

    const miband3Data = await getMiband3DataDAO(this.db)
    for (const property in miband3Data) {
      this[property] = miband3Data[property]
    }

    const po60Data = await getPO60DataDAO(this.db)
    for (const property in po60Data) {
      this[property] = po60Data[property]
    }

    const peakflowData = await getPeakFlowDataDAO(this.db)
    for (const property in peakflowData) {
      this[property] = peakflowData[property]
    }

    const pos = await getPositionsDAO(this.db)
    for (const property in pos) {
      this[property] = pos[property]
    }

    const tasksResults = await getTasksResultsDAO(this.db)
    for (const property in tasksResults) {
      this[property] = tasksResults[property]
    }
  // add new collections here
  },

  async init () {
    const config = getConfig()

    if (!config) throw new Error('a configuration must be passed')
    if (
      !config.db.host ||
      !config.db.port ||
      !config.db.user ||
      !config.db.password
    ) {
      console.error('Configuration is missing some critical parameters', config)
      throw new Error('Configuration is missing some critical parameters')
    }
    this.db = new Database({
      url: 'http://' + config.db.host + ':' + config.db.port
    })

    this.initializeDAOafterConnection()
  }
}
