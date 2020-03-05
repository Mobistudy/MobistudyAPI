import {startArango, stopArango, ARANGOPORT} from './arangoTools'
const axios = require('axios')

describe('when arangodb is running with mock data', () => {

  beforeAll(async () => {
    await startArango()
    console.log('arango started')
  }, 60000)

  afterAll(async () => {
    await stopArango()
  })

  test('user mobistudy can access db mobistudy', async () => {
    console.log('going to check if I can access the db')
    let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/mobistudy/', {
      auth: {
        username: 'mobistudy',
        password: 'testpwd'
      }
    })
    expect(resp.status).toBe(200)
  })

})
