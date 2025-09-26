/**
 * This provides the data access for the form descriptions.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, 'forms')
  collection.ensureIndex({ type: 'persistent', fields: ['teamKey'] })
}

const DAL = {
  /**
  * Gets transaction for forms
  * @returns {string}
  */
  formsTransaction () {
    return COLLECTIONNAME
  },

  async getFormsList () {
    const filter = ''
    const query =
      'FOR form in forms ' +
      filter +
      ' SORT form.created RETURN { name: form.name, _key: form._key, created: form.created }'
    applogger.trace('Querying "' + query + '"')
    const cursor = await db.query(query)
    return cursor.all()
  },

  async getAllForms () {
    const filter = ''

    // TODO: use LIMIT @offset, @count in the query for pagination

    const query = 'FOR form in forms ' + filter + ' RETURN form'
    applogger.trace('Querying "' + query + '"')
    const cursor = await db.query(query)
    return cursor.all()
  },

  async createForm (newform) {
    const meta = await collection.save(newform)
    newform._key = meta._key
    return newform
  },

  async getOneForm (_key) {
    const form = await collection.document(_key)
    return form
  },

  // udpates a form, we assume the _key is the correct one
  async replaceForm (_key, form) {
    const meta = await collection.replace(_key, form)
    form._key = meta._key
    return form
  },

  // udpates a form, we assume the _key is the correct one
  async updateForm (_key, form) {
    const newval = await collection.update(_key, form, {
      keepNull: false,
      mergeObjects: true,
      returnNew: true
    })
    return newval.new
  },

  // deletes a form
  async deleteForm (_key) {
    await collection.remove(_key)
    return true
  }
}

export { init, DAL }
