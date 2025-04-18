/**
* Medical vocabulary used to match term (in supported languages) with a unique ID
* these IDs are used for inclusion criteria matching.
**/
import axios from 'axios'
import { applogger } from './logger.mjs'

export default {
  /**
   *
   * @param {string} term term or part of term to be searched for
   * @param {string} type can be 'substance' or 'disorder'
   * @param {string} lang en, es, it or sv
   * @param {integer} limit max number of terms
   * @returns Promise passing an array of terms with `term` (the word), `conceptId` (unique ID for the word) and `vocabulary` (vocabulary used)
   */
  async getTerm (term, type, lang, limit) {
    if (!term) throw new Error('A term must be specified')
    if (!lang) throw new Error('A langauge must be specified')
    if (!type) throw new Error('A type must be specified')

    const apibase = 'https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/'
    let version = '2025-04-01/' // international, english version
    if (lang === 'sv') version = 'SNOMEDCT-SE/2024-11-30/' // swedish version
    if (lang === 'es') version = 'SNOMEDCT-ES/2024-09-30/' // spanish version
    if (lang === 'it') version = 'SNOMEDCT-CH/2024-12-07/' // swiss italian version
    const url = apibase + version + 'descriptions'

    let acceptedLangs = 'en'
    if (lang === 'sv') acceptedLangs = 'sv,en'
    if (lang === 'es') acceptedLangs = 'es,en'
    if (lang === 'it') acceptedLangs = 'it,en'
    let language = 'en'
    if (lang === 'sv') language = 'sv'
    if (lang === 'es') language = 'es'
    if (lang === 'it') language = 'it'
    let vocabulary = 'SNOMEDCT-I-20250401'
    if (lang === 'sv') vocabulary = 'SNOMEDCT-SE-20241130'
    if (lang === 'es') vocabulary = 'SNOMEDCT-ES-20240930'
    if (lang === 'it') vocabulary = 'SNOMEDCT-CH-20241207'

    let request = {
      headers: {
        'Accept-Language': acceptedLangs,
        'Accept': 'application/json',
        'Sec-fetch-mode': 'cors',
        'User-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      },
      mode: 'cors',
      params: {
        term: term,
        language: language,
        conceptActive: true,
        active: true,
        semanticTags: type,
        searchMode: 'STANDARD',
        offset: 0,
        limit: limit
      }
    }
    applogger.trace(request, 'Contacting SNOMED to search for a term')
    const resp = await axios.get(url, request)
    const raw = resp.data
    const output = []
    for (const concept of raw.items) {
      if (concept.active && concept.languageCode === lang) {
        output.push({
          term: concept.term,
          conceptId: concept.concept.id,
          vocabulary: vocabulary
        })
      }
    }
    return output
  }
}
