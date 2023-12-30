/**
 * This module is a Data Access Layer (DAL), it abstracts the database with functions.
 */
import Database from 'arangojs'
import getConfig from '../services/config.mjs'

import * as users from './usersDAL.mjs'
import * as teams from './teamsDAL.mjs'

import * as auditLog from './auditLogDAL.mjs'
import * as studies from './studiesDAL.mjs'
import * as participants from './participantsDAL.mjs'
import * as forms from './formsDAL.mjs'
import * as tasksResults from './tasksResultsDAL.mjs'
import * as studystats from './studiesStatsDAL.mjs'


// will be removed:
import * as answers from './answersDAL.mjs'
import * as healthstore from './healthStoreDataDAL.mjs'
import * as miband3 from './miband3DataDAL.mjs'
import * as peakflows from './peakflowDataDAL.mjs'
import * as positions from './positionsDAL.mjs'


import { applogger } from '../services/logger.mjs'

export let DAL = {
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

  async extendDAL () {
    Object.assign(this, users.DAL)
    Object.assign(this, teams.DAL)
    Object.assign(this, studies.DAL)
    Object.assign(this, participants.DAL)
    Object.assign(this, auditLog.DAL)
    Object.assign(this, forms.DAL)
    Object.assign(this, tasksResults.DAL)
    Object.assign(this, studystats.DAL)

    // will be removed:
    Object.assign(this, answers.DAL)
    Object.assign(this, healthstore.DAL)
    Object.assign(this, miband3.DAL)
    Object.assign(this, peakflows.DAL)
    Object.assign(this, positions.DAL)
  },

  async init () {
    if (!this.db) {
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
      try {
        this.db = new Database({
          url: 'http://' + config.db.host + ':' + config.db.port,
          databaseName: config.db.name,
          auth: { username: config.db.user, password: config.db.password }
        })
      }
      catch (err) {
        applogger.fatal(err, 'Cannot connect to database')
        throw err
      }

      applogger.debug('Connected to database')
    }

    // init all parts of the DAL
    await users.init(this.db)
    await teams.init(this.db)
    await auditLog.init(this.db)
    await studies.init(this.db)
    await participants.init(this.db)
    await forms.init(this.db)
    await tasksResults.init(this.db)
    await studystats.init(this.db)

    // will be removed
    await answers.init(this.db)
    await healthstore.init(this.db)
    await miband3.init(this.db)
    await peakflows.init(this.db)
    await positions.init(this.db)

    // add all functions
    return this.extendDAL()
  }
}
