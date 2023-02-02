import Database from 'arangojs'

let db

export const ARANGOPORT = '5555'
const ROOT_PWD = ''

/**
 * Connects or creates a new database
 * @param {string} dbname database name
 * @returns a promise
 */
export const connectToDatabase = async function (dbname) {
  if (!db) {
    db = new Database({
      url: 'http://127.0.0.1:' + ARANGOPORT,
      auth: { username: 'root', password: ROOT_PWD },
    })
  } else {
    db.database('_system')
    db.useBasicAuth('root', ROOT_PWD)
  }

  const names = await db.listUserDatabases()
  if (names.includes(dbname)) {
    // drop it first
    await db.dropDatabase(dbname)
  }
  // create it
  await db.createDatabase(dbname, {
    users: [{ username: 'mobistudy', passwd: 'testpwd' }]
  })

  db.database(dbname)
  db.useBasicAuth('mobistudy', 'testpwd')

  return db
}

/**
 * Drops an entire database
 * @param {string} dbname database name
 * @returns a promise
 */
export const dropDatabase = async function (dbname) {
  db.database('_system')
  db.useBasicAuth('root', ROOT_PWD)
  await db.dropDatabase(dbname)
}

/**
 * Loads or create a collection
 * @param {string} collname name fo the collection
 * @returns a promise that returns the collection object
 */
export const getCollection = async function (collname) {
  // load or create collection
  let names = await db.listCollections()

  for (var ii = 0; ii < names.length; ii++) {
    if (names[ii].name === collname) {
      return db.collection(collname)
    }
  }
  return db.createCollection(collname)
}

export const addDataToCollection = async function (collname, data) {
  let collection = await getCollection(collname)
  let meta = await collection.save(data)
  return meta._key
}

export const removeFromCollection = async function (collname, key) {
  let collection = await getCollection(collname)
  return collection.remove(key)
}

export const getFromCollection = async function (collname, key) {
  let collection = await getCollection(collname)
  const results = await collection.document(key)
  return results
}

export { db as DB }
