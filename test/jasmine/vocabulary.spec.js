import { getTerm } from '../../src/services/vocabulary.mjs'

// tests deactivated to avoid spamming public APIs
// REMOVE THE x TO ACTIVATE THE TESTS
xdescribe('when searching for a medical term', () => {

  it('you can retrieve heart failure in english', async () => {
    let concepts = await getTerm('heart failure', 'disorder', 'en', 10)
    expect(concepts.length).not.toBe(0)
    expect(concepts).toContain({
      term: 'Heart failure',
      conceptId: '84114007',
      vocabulary: 'SNOMEDCT'
    })
  })

  it('you can retrieve heart failure in swedish', async () => {
    let concepts = await getTerm('hjärt', 'disorder', 'sv', 10)
    expect(concepts.length).not.toBe(0)
    expect(concepts).toContain({
      term: 'hjärtsvikt',
      conceptId: '84114007',
      vocabulary: 'SNOMEDCT-SE'
    })
  })

})
