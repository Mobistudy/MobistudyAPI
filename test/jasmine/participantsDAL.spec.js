import * as Types from '../../models/jsdocs.js'

import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection,
  updateDataInCollection
} from '../arangoTools.mjs'
import * as participantsDAL from '../../src/DAL/participantsDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'


describe("when arangodb is running,", () => {
  const DBNAME = "test_participantsDAL"
  let DAL = participantsDAL.DAL

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    await participantsDAL.init(db)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  it('a participant can be created', async () => {
    /** @type {Types.Participant} */
    let newParticipant = {
      createdTS: "2019-02-27T12:46:07.294Z",
      updatedTS: "2019-02-27T12:46:07.294Z",
      userKey: '123123',
      name: 'Dario',
      surname: 'Salvi'
    }
    newParticipant = await DAL.createParticipant(newParticipant)
    expect(newParticipant._key).toBeDefined()

    await removeFromCollection("participants", newParticipant._key)
  })

  describe('when one participants is set,', () => {
    let part1Key;
    beforeAll(async () => {
      part1Key = await addDataToCollection('participants', {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '123123',
        name: 'Dario',
        surname: 'Salvi'
      })
    }, 100)

    afterAll(async () => {
      await removeFromCollection('participants', part1Key)
    })

    it('participant can be retrieved by key', async () => {
      let part1 = await DAL.getOneParticipant(part1Key)
      expect(part1.name).toBe('Dario')
      expect(part1.surname).toBe('Salvi')
    })

    it('participant can be retrieved by its user key', async () => {
      let part1 = await DAL.getParticipantByUserKey('123123')
      expect(part1.name).toBe('Dario')
      expect(part1.surname).toBe('Salvi')
    })
  })

  describe('when one participants is set,', () => {
    let part1Key;
    beforeAll(async () => {
      part1Key = await addDataToCollection('participants', {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '123123',
        name: 'Dario',
        surname: 'Salvi'
      })
    }, 100)

    afterAll(async () => {
      await removeFromCollection('participants', part1Key)
    })

    it('participant can be partially updated', async () => {
      /** @type {Types.Participant} */
      let newPart = {
        name: 'Giovanni',
        surname: 'Lopez'
      }
      let part1 = await DAL.updateParticipant(part1Key, newPart)
      expect(part1.name).toBe(newPart.name)
      expect(part1.surname).toBe(newPart.surname)
      expect(part1.userKey).toBe('123123') // the partial participant doens't have a user kye
    })
  })

  describe('when one participants is set,', () => {
    let part1Key;
    beforeAll(async () => {
      part1Key = await addDataToCollection('participants', {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '123123',
        name: 'Dario',
        surname: 'Salvi'
      })
    }, 100)

    afterAll(async () => {
      await removeFromCollection('participants', part1Key)
    })

    it('participant can be replaced', async () => {
      /** @type {Types.Participant} */
      let newPart = {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '124124',
        name: 'Sergio',
        surname: 'Marro'
      }
      let part1 = await DAL.replaceParticipant(part1Key, newPart)
      expect(part1.name).toBe(newPart.name)
      expect(part1.surname).toBe(newPart.surname)
      expect(part1.userKey).toBe(newPart.userKey)
    })
  })

  describe('when one participants is set,', () => {
    let part1Key;
    beforeAll(async () => {
      part1Key = await addDataToCollection('participants', {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '123123',
        name: 'Dario',
        surname: 'Salvi'
      })
    }, 100)

    it('participant can be deleted', async () => {
      let parts = await DAL.getAllParticipants()
      expect(parts.length).toBe(1)

      await DAL.removeParticipant(part1Key)

      parts = await DAL.getAllParticipants()
      expect(parts.length).toBe(0)
    })
  })

  describe('when a few participants are set,', () => {
    let study1Key, study2Key, team1Key, part1Key, part2Key, part3Key;
    beforeAll(async () => {
      team1Key = await addDataToCollection('teams', {
        createdTS: "2019-02-27T12:46:07.294Z",
        name: 'team1'
      })
      study1Key = await addDataToCollection('studies', {
        createdTS: "2019-02-27T12:46:07.294Z",
        name: 'study1',
        teamKey: team1Key
      })
      study2Key = await addDataToCollection('studies', {
        createdTS: "2019-02-27T12:46:07.294Z",
        name: 'study2',
        teamKey: team1Key
      })
      part1Key = await addDataToCollection('participants', {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '123123', // user key of participant 1
        name: 'Dario',
        surname: 'Salvi',
        studies: [{
          studyKey: study1Key,
          currentStatus: 'accepted',
          acceptedTS: '2019-02-27T12:46:07.294Z',
        }, {
          studyKey: 'anotherStudy',
          currentStatus: 'accepted',
          acceptedTS: '2019-02-27T12:46:07.294Z',
        }]
      })
      part2Key = await addDataToCollection('participants', {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '234234',
        name: 'John',
        surname: 'Doe',
        studies: [{
          studyKey: study1Key,
          currentStatus: 'withdrawn',
          acceptedTS: '2019-02-27T12:46:07.294Z',
        }]
      })
      part3Key = await addDataToCollection('participants', {
        createdTS: "2019-02-27T12:46:07.294Z",
        userKey: '345345',
        name: 'Maria',
        surname: 'Carrie',
        studies: [{
          studyKey: study1Key,
          currentStatus: 'completed',
          acceptedTS: '2019-02-27T12:46:07.294Z',
        }, {
          studyKey: study2Key,
          currentStatus: 'accepted',
          acceptedTS: '2019-02-27T12:46:07.294Z',
        }]
      })
    }, 100)

    afterAll(async () => {
      await removeFromCollection('teams', team1Key)
      await removeFromCollection('studies', study1Key)
      await removeFromCollection('studies', study2Key)
      await removeFromCollection('participants', part1Key)
      await removeFromCollection('participants', part2Key)
      await removeFromCollection('participants', part3Key)
    })

    it('all participants can be queried', async () => {
      let parts = await DAL.getAllParticipants()

      expect(parts.length).toBe(3)
      expect(parts[0].name).toBe('Dario')
      expect(parts[1].name).toBe('John')
      expect(parts[2].name).toBe('Maria')
    })

    it('all participants can be queried by status', async () => {
      let parts = await DAL.getAllParticipants('accepted')

      expect(parts.length).toBe(2)
      expect(parts[0].name).toBe('Dario')
      expect(parts[1].name).toBe('Maria')
    })

    it('all participants can be queried and paged', async () => {
      let parts = await DAL.getAllParticipants(null, null, 0, 2)

      expect(parts.totalCount).toBe(3)
      expect(parts.subset.length).toBe(2)
      expect(parts.subset[0].name).toBe('Dario')
      expect(parts.subset[1].name).toBe('John')
    })

    it('participants can be queried by study', async () => {
      let parts = await DAL.getParticipantsByStudy(study1Key)

      expect(parts.length).toBe(3)
      expect(parts[0].name).toBe('Dario')
      expect(parts[1].name).toBe('John')
      expect(parts[2].name).toBe('Maria')

      parts = await DAL.getParticipantsByStudy(study2Key)

      expect(parts.length).toBe(1)
      expect(parts[0].name).toBe('Maria')
    })

    it('participants can be queried by team', async () => {
      let parts = await DAL.getParticipantsByTeam(team1Key)

      expect(parts.length).toBe(3)
      expect(parts[0].name).toBe('Dario')
      expect(parts[1].name).toBe('John')
      expect(parts[2].name).toBe('Maria')
    })

    it('participants can be queried by team and study', async () => {
      let parts = await DAL.getParticipantsByTeam(team1Key, study2Key)

      expect(parts.length).toBe(1)
      expect(parts[0].name).toBe('Maria')
    })

    it('participants can be queried by study and status', async () => {
      let parts = await DAL.getParticipantsByStudy(study1Key, 'accepted')

      expect(parts.length).toBe(1)
      expect(parts[0].name).toBe('Dario')
      expect(parts[0].studies.length).toBe(1)
    })

    it('participants can be queried by team and status', async () => {
      let parts = await DAL.getParticipantsByTeam(team1Key, null, 'accepted')

      expect(parts.length).toBe(2)
      expect(parts[0].name).toBe('Dario')
      expect(parts[1].name).toBe('Maria')
    })

    it('participants can be queried by study and paged', async () => {
      let parts = await DAL.getParticipantsByStudy(study1Key, null, 0, 2)

      expect(parts.totalCount).toBe(3)
      expect(parts.subset.length).toBe(2)
      expect(parts.subset[0].name).toBe('Dario')
      expect(parts.subset[0].studies.length).toBe(1)
      expect(parts.subset[0].studies[0].studyKey).toBe(study1Key)
      expect(parts.subset[1].name).toBe('John')
      expect(parts.subset[1].studies.length).toBe(1)
      expect(parts.subset[1].studies[0].studyKey).toBe(study1Key)
    })

    describe('when adding a researcher,', () => {
      let researcherUKey
      beforeAll(async () => {
        researcherUKey = await addDataToCollection('users', {
          createdTS: "2019-02-27T12:46:07.294Z",
          role: 'researcher'
        })

        await updateDataInCollection('teams', {
          createdTS: "2019-02-27T12:46:07.294Z",
          name: 'team1',
          researchers: [{
            userKey: researcherUKey,
            studiesOptions: [{
              studyKey: study1Key,
              preferredParticipantsKeys: [
                '123123' // participant 1 user key
              ]
            }]
          }]
        }, team1Key)
      })

      afterAll(async () => {
        await removeFromCollection('users', researcherUKey)
      })

      it('participants can be queried by researcher', async () => {
        let parts = await DAL.getParticipantsByResearcher(researcherUKey)

        expect(parts.length).toBe(3)
        expect(parts[0].name).toBe('Dario')
        expect(parts[0].studies.length).toBe(1)
        expect(parts[0].studies[0].studyKey).toBe(study1Key)
        expect(parts[1].name).toBe('John')
        expect(parts[1].studies.length).toBe(1)
        expect(parts[1].studies[0].studyKey).toBe(study1Key)
        expect(parts[2].name).toBe('Maria')
        expect(parts[2].studies.length).toBe(2)
        expect(parts[2].studies[0].studyKey).toBe(study1Key)
        expect(parts[2].studies[1].studyKey).toBe(study2Key)
      })

      it('participants can be queried by researcher and by status', async () => {
        let parts = await DAL.getParticipantsByResearcher(researcherUKey, 'accepted')

        expect(parts.length).toBe(2)
        expect(parts[0].name).toBe('Dario')
        expect(parts[0].studies.length).toBe(1)

        expect(parts[1].name).toBe('Maria')
        expect(parts[1].studies.length).toBe(1)
        expect(parts[1].studies[0].studyKey).toBe(study2Key)
      })

      it('participants can be queried by researcher and paged', async () => {
        let parts = await DAL.getParticipantsByResearcher(researcherUKey, null, null, null, 0, 2)

        expect(parts.totalCount).toBe(3)
        expect(parts.subset.length).toBe(2)
        expect(parts.subset[0].name).toBe('Dario')
        expect(parts.subset[0].studies.length).toBe(1)
        expect(parts.subset[0].studies[0].studyKey).toBe(study1Key)
        expect(parts.subset[1].name).toBe('John')
        expect(parts.subset[1].studies.length).toBe(1)
        expect(parts.subset[1].studies[0].studyKey).toBe(study1Key)
      })

      it('participants can be queried by researcher and filtered by preferred', async () => {
        let parts = await DAL.getParticipantsByResearcher(researcherUKey, null, true)

        expect(parts.length).toBe(1)
        expect(parts[0].name).toBe('Dario')
        expect(parts[0].studies.length).toBe(1)
      })

      it('participants can be queried by researcher and status and filtered by preferred', async () => {
        let parts = await DAL.getParticipantsByResearcher(researcherUKey, 'accepted', true)

        expect(parts.length).toBe(1)
        expect(parts[0].name).toBe('Dario')
        expect(parts[0].studies.length).toBe(1)
      })

      it('participants can be queried by researcher and by team', async () => {
        let parts = await DAL.getParticipantsByResearcher(researcherUKey, null, null, team1Key)

        expect(parts.length).toBe(3)
        expect(parts[0].name).toBe('Dario')
        expect(parts[0].studies.length).toBe(1)
        expect(parts[0].studies[0].studyKey).toBe(study1Key)
        expect(parts[1].name).toBe('John')
        expect(parts[1].studies.length).toBe(1)
        expect(parts[1].studies[0].studyKey).toBe(study1Key)
        expect(parts[2].name).toBe('Maria')
        expect(parts[2].studies.length).toBe(2)
        expect(parts[2].studies[0].studyKey).toBe(study1Key)
        expect(parts[2].studies[1].studyKey).toBe(study2Key)
      })

      it('participants can be linked to researcher', async () => {
        let isLinked = await DAL.hasResearcherParticipant(researcherUKey, '123123')
        expect(isLinked).toBe(true)

        isLinked = await DAL.hasResearcherParticipant(researcherUKey, null, part1Key)
        expect(isLinked).toBe(true)

        isLinked = await DAL.hasResearcherParticipant(researcherUKey, '234234')
        expect(isLinked).toBe(true)

        isLinked = await DAL.hasResearcherParticipant(researcherUKey, null, part2Key)
        expect(isLinked).toBe(true)

        isLinked = await DAL.hasResearcherParticipant(researcherUKey, '345345')
        expect(isLinked).toBe(true)

        isLinked = await DAL.hasResearcherParticipant(researcherUKey, null, part3Key)
        expect(isLinked).toBe(true)

        isLinked = await DAL.hasResearcherParticipant(researcherUKey, '99999')
        expect(isLinked).toBe(false)

        isLinked = await DAL.hasResearcherParticipant(researcherUKey, null, '99999')
        expect(isLinked).toBe(false)
      })


    })


  })

})
