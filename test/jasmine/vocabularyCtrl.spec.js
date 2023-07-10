import vocabularyCtrl from '../../src/controllers/vocabularyCtrl.mjs'
import { applogger } from '../../src/services/logger.mjs'
import vocabulary from '../../src/services/vocabulary.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'

describe('Testing vocabulary controller,', () => {

  beforeAll(async () => {
    spyOnAllFunctions(applogger)
  }, 1000)

  it('no params no party', async () => {
    let res = new MockResponse()
    vocabularyCtrl.getTerm({
      params: {

      }
    }, res)
    expect(res.code).toBe(400)
  })

  it('no query no party', async () => {
    let res = new MockResponse()
    vocabularyCtrl.getTerm({
      params: {
        lang: 'en',
        params: 'distance'
      },
      query: {

      }
    }, res)
    expect(res.code).toBe(400)
  })

  it('all params OK, then OK', async () => {
    spyOn(vocabulary, 'getTerm').and.returnValue([{}, {}])

    let res = new MockResponse()
    vocabularyCtrl.getTerm({
      params: {
        lang: 'en',
        type: 'disorder'
      },
      query: {
        term: 'heart'
      }
    }, res)
    expect(res.code).not.toBe(400)
    expect(vocabulary.getTerm).toHaveBeenCalledTimes(1)
  })
})
