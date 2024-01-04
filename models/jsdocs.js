/**
 * A person object with a name and age.
 * @template T
 * @typedef {Object} PagedQueryResult
 * @property {!number} totalCount - total number of elements in the dataset
 * @property {!Array<T>} subset - current subset
*/

/**
 * A person object with a name and age.
 * @typedef {Object} Participant
 * @property {!string} userKey - key of the user
 * @property {string} createdTS - ISO 8610 of when the participant has been created
 * @property {string} updatedTS - ISO 8610 of when the participant has been updated
 * @property {string} name - name of the participant
 * @property {string} surname - surname of the participant
 * @property {string} sex - can be 'male', 'female', 'other'
 * @property {string} dateOfBirth - ISO 8610 date of birth (yyyy-mm-dd)
 * @property {string} country - country of residence, ISO 2 letters standard
 * @property {string} language - preferred language, ISO 2 letters
 * @property {number} height - height in cm
 * @property {number} weight - weight in kg
 * @property {array} diseases - list of current long-term diseases / conditions
 * @property {array} medications - list of current long-term medications
 * @property {boolean} studiesSuggestions - true if the participants wants to be suggested studies
 * @property {array} studies - list of studies that were accepted or rejected
 */

export const Types = {}
