import axios from 'axios'

async function getDiseaseEngNHS (term, limit) {
  //https://termbrowser.nhs.uk/sct-browser-api/snomed/uk-edition/v20250312/descriptions?query=heart&limit=50&searchMode=partialMatching&lang=english&statusFilter=activeOnly&skipTo=0&returnLimit=100&semanticFilter=disorder&normalize=true
  let resp = await axios.get('https://termbrowser.nhs.uk/sct-browser-api/snomed/uk-edition/v20250312/descriptions',
    {
      headers: {
        'Accept-Language': 'en',
        'Accept': 'application/json',
        'Sec-fetch-mode': 'cors',
        'User-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      },
      params: {
        lang: 'english',
        query: term,
        conceptActive: true,
        active: true,
        statusFilter: 'activeOnly',
        semanticFilter: 'disorder',
        searchMode: 'partialMatching',
        normalize: true,
        skipTo: 0,
        offset: 0,
        limit: limit,
        returnLimit: limit
      }
    })
  let raw = resp.data
  let output = []
  for (let concept of raw.matches) {
    if (concept.active) {
      output.push({
        term: concept.term,
        conceptId: concept.conceptId,
        vocabulary: 'SNOMEDCT-UK-20250312'
      })
    }
  }
  return output
}

async function getDiseaseEng (term, limit) {
  /*
  curl -X 'GET' \
  'https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN%2F2025-04-01/descriptions?term=heart&active=true&language=en&semanticTags=disorder&conceptActive=true&groupByConcept=false&searchMode=STANDARD&offset=0&limit=5' \
  -H 'accept: application/json' \
  -H 'Accept-Language: en'
  */
  let resp = await axios.get('https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/2025-04-01/descriptions',
    {
      headers: {
        'Accept-Language': 'en',
        'Accept': 'application/json',
        'Sec-fetch-mode': 'cors',
        'User-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      },
      mode: 'cors',
      params: {
        language: 'en',
        term: term,
        conceptActive: true,
        active: true,
        semanticTags: 'disorder',
        searchMode: 'STANDARD',
        normalize: true,
        offset: 0,
        limit: limit
      }
    })
  let raw = resp.data
  let output = []
  for (let concept of raw.items) {
    if (concept.active) {
      output.push({
        term: concept.term,
        conceptId: concept.concept.id,
        vocabulary: 'SNOMEDCT-I-20250401'
      })
    }
  }
  return output
}


async function getDiseaseSwe (term, limit) {
  /**
   curl -X 'GET' \
  'https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN%2FSNOMEDCT-SE%2F2024-11-30%2F/descriptions?term=hj%C3%A4rt&active=true&language=sv&semanticTags=disorder&conceptActive=true&groupByConcept=true&searchMode=STANDARD&offset=0&limit=5' \
  -H 'accept: application/json' \
  -H 'Accept-Language: sv,en'
   */
  let resp = await axios.get('https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/SNOMEDCT-SE/2024-11-30/descriptions',
    {
      headers: {
        'Accept-Language': 'sv,en',
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      },
      mode: 'cors',
      params: {
        term: term,
        language: 'sv',
        conceptActive: true,
        active: true,
        semanticTags: 'disorder',
        searchMode: 'STANDARD',
        offset: 0,
        limit: limit
      }
    })
  let raw = resp.data
  let output = []
  for (let concept of raw.items) {
    if (concept.active && concept.languageCode == 'sv') {
      output.push({
        term: concept.term,
        conceptId: concept.concept.id,
        vocabulary: 'SNOMEDCT-SE-20241130'
      })
    }
  }
  return output
}

async function getDiseaseSpa (term, limit) {
  /**
   curl -X 'GET' \
  'https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN%2FSNOMEDCT-ES%2F2024-09-30%2F/descriptions?term=insuficiencia&active=true&language=es&semanticTags=disorder&conceptActive=true&groupByConcept=true&searchMode=STANDARD&offset=0&limit=5' \
  -H 'accept: application/json' \
  -H 'Accept-Language: es,en'
   */
  let resp = await axios.get('https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/SNOMEDCT-ES/2024-09-30/descriptions',
    {
      headers: {
        'Accept-Language': 'es, en',
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      },
      params: {
        term: term,
        language: 'es',
        conceptActive: true,
        active: true,
        semanticTags: 'disorder',
        searchMode: 'STANDARD',
        offset: 0,
        limit: limit
      }
    })
  let raw = resp.data
  let output = []
  for (let concept of raw.items) {
    if (concept.active) {
      output.push({
        term: concept.term,
        conceptId: concept.concept.id,
        vocabulary: 'SNOMEDCT-ES-20240930'
      })
    }
  }
  return output
}


async function getDiseaseIta (term, limit) {
  /**
   curl -X 'GET' \
  'https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN%2FSNOMEDCT-ES%2F2024-09-30%2F/descriptions?term=insuficiencia&active=true&language=es&semanticTags=disorder&conceptActive=true&groupByConcept=true&searchMode=STANDARD&offset=0&limit=5' \
  -H 'accept: application/json' \
  -H 'Accept-Language: es,en'
   */
  let resp = await axios.get('https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/SNOMEDCT-CH/2024-12-07/descriptions',
    {
      headers: {
        'Accept-Language': 'it, en',
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      },
      params: {
        term: term,
        language: 'it',
        conceptActive: true,
        active: true,
        semanticTags: 'disorder',
        searchMode: 'STANDARD',
        offset: 0,
        limit: limit
      }
    })
  let raw = resp.data
  let output = []
  for (let concept of raw.items) {
    if (concept.active) {
      output.push({
        term: concept.term,
        conceptId: concept.concept.id,
        vocabulary: 'SNOMEDCT-CH-20241207'
      })
    }
  }
  return output
}


(async () => {

  // let heart = await getDiseaseEng('heart', 5)
  // console.log(heart)

  // let heartn = await getDiseaseEngNhs('heart', 5)
  // console.log(heartn)

  // let hjarta = await getDiseaseSwe('hjärta', 5)
  // console.log(hjarta)

  // let insuficiencia = await getDiseaseSpa('insuficiencia', 5)
  // console.log(insuficiencia)

  let insuficienza = await getDiseaseIta('insufficien', 5)
  console.log(insuficienza)
})()
