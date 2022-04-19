import Arango from 'arangojs'

let db

export const ARANGOPORT = '5555'

export const connectToDatabase = async function (dbname) {
  db = new Arango({
    url: 'http://localhost:' + ARANGOPORT,
    precaptureStackTraces: true,
    auth: { username: 'root', password: '' },
  })
  const names = await db.listUserDatabases()
  if (!names.includes(dbname)) {
    await db.createDatabase(dbname, {
      users: [{ username: 'mobistudy', passwd: 'testpwd' }]
    })
  }

  db.useDatabase(dbname)
  db.useBasicAuth('mobistudy', 'testpwd')

  return db
}

export const dropDatabase = async function (dbname) {
  db.useDatabase('_system')
  db.useBasicAuth('root', 'testtest')
  await db.dropDatabase(dbname)
}

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

export { db as DB }
