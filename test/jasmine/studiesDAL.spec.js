import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as studies from '../../src/DAL/studiesDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

// Storage module used for testing
let testDAL = {}

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf())
  date.setDate(date.getDate() + days)
  return date
};

Date.prototype.toISODateString = function () {
  return this.toISOString().slice(0, 10)
}

describe("when arangodb is running,", () => {
  const DBNAME = "test_studiesDAL";

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await studies.init(db)
    Object.assign(testDAL, studies.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("when a bunch of users and teams are set,", () => {
    let researcher1Key, team1Key;
    beforeAll(async () => {
      // feed with some initial data
      researcher1Key = await addDataToCollection("users", {
        email: "reseacher1@uni1.edu",
        hashedPasswor: "xxxxxxxx",
        role: "researcher",
      })

      team1Key = await addDataToCollection("teams", {
        name: "team1",
        createdTS: "2018-11-12T16:40:07.542Z",
        researchersKeys: [researcher1Key],
        invitationCode: "xxxx",
        invitationExpiry: "2018-11-26T10:13:08.386Z",
      })
    }, 5000)

    afterAll(async () => {
      await removeFromCollection('users', researcher1Key)
      await removeFromCollection('teams', team1Key)
    }, 5000)

    it("a new study can be created and found", async () => {
      let newStudy = await testDAL.createStudy({
        createdTS: "2019-02-27T12:46:07.294Z",
        updatedTS: "2019-02-27T12:46:07.294Z",
        teamKey: team1Key,
        generalities: {
          title: {
            en: "study2",
          },
        },
      })
      expect(newStudy._key).toBeDefined()

      let study2 = await testDAL.getOneStudy(newStudy._key)
      expect(study2.generalities).toBeDefined()
      expect(study2.generalities.title).toBeDefined()
      expect(study2.generalities.title.en).toBe(newStudy.generalities.title.en)
      await removeFromCollection("studies", newStudy._key)
    })

    it("a new invitational study can be created and found", async () => {
      let newcode = await testDAL.getNewInvitationCode()

      expect(newcode).toBeDefined();
      expect(newcode.length).toBe(6);

      let newStudy = await testDAL.createStudy({
        createdTS: "2019-02-27T12:46:07.294Z",
        updatedTS: "2019-02-27T12:46:07.294Z",
        teamKey: team1Key,
        invitational: true,
        invitationCode: newcode,
        generalities: {
          title: {
            en: "study3",
          },
        },
      })
      expect(newStudy._key).toBeDefined()

      let study = await testDAL.getInvitationalStudy(newcode)

      expect(study._key).toBe(newStudy._key)
      expect(study.invitational).toBeTruthy()

      await removeFromCollection("studies", newStudy._key)
    })

    describe('when a participant and a study are present,', () => {
      let userKey1, userKey2, part1key, part2key, study1key
      beforeAll(async () => {
        userKey1 = await addDataToCollection("users", {
          email: "participant1@home.com",
          hashedPasswor: "xxxxxxxx",
          role: "participant",
        })

        userKey2 = await addDataToCollection("users", {
          email: "participant2@home.com",
          hashedPasswor: "xxxxxxxx",
          role: "participant",
        })

        part1key = await addDataToCollection("participants", {
          userKey: userKey1,
          name: "part1",
          sex: "male",
          dateOfBirth: "1980-02-27",
          country: "gb",
          language: "en",
          height: 180,
          weight: 78,
          diseases: [],
          medications: [],
          studiesSuggestions: true,
          studies: [],
        })

        study1key = await addDataToCollection("studies", {
          publishedTS: "2020-02-27T12:46:07.294Z",
          teamKey: team1Key,
          generalities: {
            title: {
              en: "study2",
            },
            languages: ["en"],
            startDate: "2020-02-01",
            endDate: new Date().addDays(60).toISODateString(),
          },
          inclusionCriteria: {
            countries: ["gb"],
            minAge: 18,
            maxAge: 100,
            sex: ["male", "female", "other"],
            numberOfParticipants: 5,
            diseases: [],
            medications: [],
            minBMI: 18,
            maxBMI: 30,
          }
        })

        part2key = await addDataToCollection("participants", {
          userKey: userKey1,
          name: "part2",
          sex: "female",
          dateOfBirth: "1980-02-27",
          country: "it",
          language: "en",
          height: 180,
          weight: 78,
          diseases: [],
          medications: [],
          studiesSuggestions: true,
          studies: [{
            studyKey: study1key
          }],
        })
      }, 5000)

      afterAll(async () => {
        await removeFromCollection('users', userKey1)
        await removeFromCollection('participants', part1key)
        await removeFromCollection('studies', study1key)
      }, 5000)

      it("someone with no studies and right age, sex, country is selected", async () => {
        let matchedStudies = await testDAL.getMatchedNewStudies(
          userKey1
        )
        expect(matchedStudies).toContain(study1key)
      })

      it("study can be found", async () => {
        // after, before, studyTitle, teamsKeys, participantKey, summary, sortDirection, offset, count, dataCallback
        let studies = await testDAL.getStudies(
        )
        expect(studies.length).toBe(1)
        expect(studies[0].teamKey).toBe(team1Key)
      })

      it("study can be filtered by team key", async () => {
        // after, before, studyTitle, teamsKeys, participantKey, summary, sortDirection, offset, count, dataCallback
        let studies = await testDAL.getStudies(
          null, null, null, [team1Key]
        )
        expect(studies.length).toBe(1)
        expect(studies[0].teamKey).toBe(team1Key)
      })

      it("study can be filtered by participant key", async () => {
        // after, before, studyTitle, teamsKeys, participantKey, summary, sortDirection, offset, count, dataCallback
        let studies = await testDAL.getStudies(
          null, null, null, null, part2key
        )
        expect(studies.length).toBe(1)
        expect(studies[0]._key).toBe(study1key)
      })
    })


    it("a study can be deleted", async () => {
      let newStudy = await testDAL.createStudy({
        createdTS: "2019-02-27T12:46:07.294Z",
        updatedTS: "2019-02-27T12:46:07.294Z",
        teamKey: team1Key,
        invitational: true,
        generalities: {
          title: {
            en: "study3",
          },
        },
      })
      expect(newStudy._key).toBeDefined()

      await testDAL.deleteStudy(newStudy._key)

      let study = await testDAL.getOneStudy(newStudy._key)

      expect(study).not.toBeDefined()
    })
  })
})
