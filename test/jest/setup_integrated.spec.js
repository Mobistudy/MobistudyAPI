import {
  ARANGOPORT,
  connectToDatabase, dropDatabase
} from '../arangoTools'
const axios = require('axios')

describe('when arangodb is running ', () => {

  const DBNAME = 'test_setup'

  beforeAll(async () => {
    await connectToDatabase(DBNAME)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  test('user mobistudy can access db mobistudy', async () => {
    let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/' + DBNAME + '/', {
      auth: {
        username: 'mobistudy',
        password: 'testpwd'
      }
    })
    expect(resp.status).toBe(200)
  })

})
