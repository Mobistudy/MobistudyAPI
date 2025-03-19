import { getLanguageFromAcceptedList, default as i18n } from '../../src/i18n/i18n.mjs'

describe('when using lang from list', () => {
  it('a list with only english gives en', () => {
    let lang = getLanguageFromAcceptedList(['en'])
    expect(lang).toBe('en')
  })

  it('a list with only british english gives en', () => {
    let lang = getLanguageFromAcceptedList(['en-gb'])
    expect(lang).toBe('en')
  })

  it('a list with only swedish gives sv', () => {
    let lang = getLanguageFromAcceptedList(['sv'])
    expect(lang).toBe('sv')
  })

  it('a list with english first and swedish second gives en', () => {
    let lang = getLanguageFromAcceptedList(['en', 'sv'])
    expect(lang).toBe('en')
  })

  it('a list with no supported languages gives en', () => {
    let lang = getLanguageFromAcceptedList(['sq', 'de'])
    expect(lang).toBe('en')
  })

  it('an empty list gives en', () => {
    let lang = getLanguageFromAcceptedList([])
    expect(lang).toBe('en')
  })

  it('an undefined list gives en', () => {
    let lang = getLanguageFromAcceptedList()
    expect(lang).toBe('en')
  })

  it('a list with sq, de and sv gives sv', () => {
    let lang = getLanguageFromAcceptedList(['sq', 'de', 'sv'])
    expect(lang).toBe('sv')
  })

  it('a list with sq, de and sv-SW gives sv', () => {
    let lang = getLanguageFromAcceptedList(['sq', 'de', 'sv-SW'])
    expect(lang).toBe('sv')
  })

  it('a list with es, sq and en gives es', () => {
    let lang = getLanguageFromAcceptedList(['es', 'sq', 'en'])
    expect(lang).toBe('es')
  })
})

describe('when using i18n', () => {
  beforeAll(() => {
    i18n.text.testLang = {
      test: 'TEST',
      phrase: '{ n } times 1 is { n  }',
      phrase2: '{  name1} is cooler than { name2  }'
    }
    i18n.locale = 'testLang'
  })

  it('a phrase can be easily retrieved', () => {
    expect(i18n.text.testLang.test).toBe('TEST')
  })

  it('tokens are changed with actual content', () => {
    expect(i18n.t('phrase', { n: 5 })).toBe('5 times 1 is 5')
    expect(i18n.t('phrase2', { name1: 'dario', name2: 'pino' })).toBe('dario is cooler than pino')
  })
})
