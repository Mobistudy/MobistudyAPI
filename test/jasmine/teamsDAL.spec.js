import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as teamsDAL from '../../src/DAL/teamsDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

// Storage module used for testing
let testDAL = {}

describe("when arangodb is running,", () => {
  const DBNAME = "test_teamsDAL";

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    testDAL.db = db
    await teamsDAL.init(db)
    Object.assign(testDAL, teamsDAL.DAL)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe("when a bunch of users are set,", () => {
    let researcher1Key;
    beforeAll(async () => {
      // feed with some initial data
      researcher1Key = await addDataToCollection("users", {
        email: "reseacher1@uni1.edu",
        hashedPasswor: "xxxxxxxx",
        role: "researcher",
      })
    }, 5000)

    afterAll(async () => {
      await removeFromCollection('users', researcher1Key)
    }, 5000)

    it("a new team can be created and found", async () => {
      let newTeam = await testDAL.createTeam({
        createdTS: "2019-02-27T12:46:07.294Z",
        updatedTS: "2019-02-27T12:46:07.294Z",
        name: 'newteam'
      })
      expect(newTeam._key).toBeDefined()

      let foundTeam = await testDAL.getOneTeam(newTeam._key)

      expect(foundTeam).toBeDefined()
      expect(foundTeam.name).toBe('newteam')

      foundTeam = await testDAL.findTeam('newteam')

      expect(foundTeam).toBeDefined()
      expect(foundTeam.name).toBe('newteam')

      await removeFromCollection('teams', newTeam._key)
    })
  })


  describe("when a bunch of teams, researchers and studies are set,", () => {
    let team1Key, team2Key, study1Key, study2Key, researcher1Key, researcher2Key;
    beforeAll(async () => {
      researcher1Key = await addDataToCollection("users", {
        email: "reseacher1@uni1.edu",
        hashedPasswor: "xxxxxxxx",
        role: "researcher",
      })
      researcher2Key = await addDataToCollection("users", {
        email: "reseacher2@uni2.edu",
        hashedPasswor: "xxxxxxxx",
        role: "researcher",
      })
      team1Key = await addDataToCollection("teams", {
        name: "team1",
        researchers: [
          {
            userKey: researcher1Key
          }
        ]
      })
      team2Key = await addDataToCollection("teams", {
        name: "team2",
        researchers: [
          {
            userKey: researcher1Key
          },
          {
            userKey: researcher2Key
          }
        ]
      })

      study1Key = await addDataToCollection("studies", {
        createdTS: "2019-02-27T12:46:07.294Z",
        teamKey: team1Key,
        generalities: {
          title: {
            en: "study1",
          },
        },
      })
      study2Key = await addDataToCollection("studies", {
        createdTS: "2019-02-27T12:46:07.294Z",
        teamKey: team2Key,
        generalities: {
          title: {
            en: "study2",
          },
        },
      })
    }, 5000)

    afterAll(async () => {
      await removeFromCollection('teams', team1Key)
      await removeFromCollection('teams', team2Key)
      await removeFromCollection('users', researcher1Key)
      await removeFromCollection('users', researcher2Key)
      await removeFromCollection('studies', study1Key)
      await removeFromCollection('studies', study2Key)
    }, 5000)

    it("teams can be queried", async () => {
      let teams = await testDAL.getAllTeams()
      expect(teams).toBeDefined()
      expect(teams.length).toBe(2)
    })

    it("teams can be queried by study key", async () => {
      let teams = await testDAL.getAllTeams(null, study1Key)
      expect(teams).toBeDefined()
      expect(teams.length).toBe(1)
      expect(teams[0].name).toBe('team1')

      teams = await testDAL.getAllTeams(null, study2Key)
      expect(teams).toBeDefined()
      expect(teams.length).toBe(1)
      expect(teams[0].name).toBe('team2')
    })

    it("teams can be queried by researcher key", async () => {
      let teams = await testDAL.getAllTeams(researcher2Key, null)
      expect(teams).toBeDefined()
      expect(teams.length).toBe(1)
      expect(teams[0].name).toBe('team2')

      teams = await testDAL.getAllTeams(researcher1Key, null)
      expect(teams).toBeDefined()
      expect(teams.length).toBe(2)
    })

    it("teams can be queried by researcher and study", async () => {
      let teams = await testDAL.getAllTeams(researcher1Key, study2Key)
      expect(teams).toBeDefined()
      expect(teams.length).toBe(1)
    })

  })

  describe("when a team and researcher are set,", () => {
    let team1Key, researcher1Key;
    beforeAll(async () => {
      researcher1Key = await addDataToCollection("users", {
        email: "reseacher1@uni1.edu",
        hashedPasswor: "xxxxxxxx",
        role: "researcher",
      })
      team1Key = await addDataToCollection("teams", {
        name: "team1",
        researchers: [
          {
            userKey: researcher1Key
          }
        ]
      })
    }, 5000)

    it("a researcher can be removed", async () => {
      let team = await testDAL.removeResearcherFromTeam(team1Key, researcher1Key)
      expect(team).toBeDefined()
      expect(team.researchers.length).toBe(0)
    })

    afterAll(async () => {
      await removeFromCollection('teams', team1Key)
      await removeFromCollection('users', researcher1Key)
    }, 5000)
  })

  describe("when a team, researcher and studie are set,", () => {
    let team1Key, study1Key, researcher1Key;
    beforeAll(async () => {
      researcher1Key = await addDataToCollection("users", {
        email: "reseacher1@uni1.edu",
        hashedPasswor: "xxxxxxxx",
        role: "researcher",
      })
      team1Key = await addDataToCollection("teams", {
        name: "team1",
        researchers: [
          {
            userKey: 'fakeUser'
          }
        ]
      })
      study1Key = await addDataToCollection("studies", {
        createdTS: "2019-02-27T12:46:07.294Z",
        teamKey: team1Key,
        generalities: {
          title: {
            en: "study1",
          },
        },
      })
    }, 5000)

    afterAll(async () => {
      await removeFromCollection('teams', team1Key)
      await removeFromCollection('users', researcher1Key)
      await removeFromCollection('studies', study1Key)
    }, 5000)

    it("team can be found", async () => {
      let team = await testDAL.getOneTeam(team1Key)
      expect(team).toBeDefined()
      expect(team.name).toBe('team1')
    })

    it("a researcher can be added", async () => {
      let team = await testDAL.addResearcherToTeam(team1Key, researcher1Key, study1Key)
      expect(team).toBeDefined()
      expect(team.researchers.length).toBe(2)
      expect(team.researchers[1].userKey).toBe(researcher1Key)
      expect(team.researchers[1].studiesOptions).toBeDefined()
      expect(team.researchers[1].studiesOptions.length).toBe(1)
      expect(team.researchers[1].studiesOptions[0].studyKey).toBe(study1Key)
    })

    it("a researcher that is already listed can add study options", async () => {
      let team = await testDAL.addResearcherToTeam(team1Key, 'fakeUser', study1Key, { preferredParticipantsKeys: ['fakePartcipant'] })
      expect(team.researchers[0].studiesOptions.length).toBe(1)
      expect(team.researchers[0].studiesOptions[0].studyKey).toBe(study1Key)
      expect(team.researchers[0].studiesOptions[0].preferredParticipantsKeys).toBeDefined()
      expect(team.researchers[0].studiesOptions[0].preferredParticipantsKeys.length).toBe(1)
      expect(team.researchers[0].studiesOptions[0].preferredParticipantsKeys[0]).toBe('fakePartcipant')
    })

  })

})

