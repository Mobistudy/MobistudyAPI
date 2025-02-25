import teamsCtrl from '../../src/controllers/teamsCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import auditLogger from '../../src/services/auditLogger.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'
import jwt from 'jsonwebtoken'


describe('Testing teams controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    spyOnAllFunctions(applogger)
    spyOnAllFunctions(auditLogger)

    // await teamsCtrl.init()

    // mock schema validation
    teamsCtrl.validate = () => { return true }
    // mock JWT token
    teamsCtrl.JWTSecret = 'mysecretnotsosecret'
  }, 100)


  it('only admin can create a team', async () => {
    let res = new MockResponse()
    await teamsCtrl.createTeam({
      body: {
        name: 'testTeam'
      },
      user: {
        role: 'researcher'
      }
    }, res)
    expect(res.code).toBe(403)
  })

  it('admin creates a team', async () => {
    spyOn(DAL, 'findTeam').and.returnValue(null)
    spyOn(DAL, 'createTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam'
    })

    let res = new MockResponse()
    await teamsCtrl.createTeam({
      body: {
        name: 'testTeam'
      },
      user: {
        _key: 'adminkey',
        role: 'admin'
      }
    }, res)
    expect(res.code).not.toBe(500)
    expect(res.code).not.toBe(403)
    expect(DAL.createTeam).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'testTeam' }))
  })


  it('invitation code is generated', async () => {
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam'
    })
    spyOn(DAL, 'replaceTeam')

    let res = new MockResponse()
    await teamsCtrl.generateInvitationCode({
      params: {
        teamKey: 'teamKey'
      },
      user: {
        _key: 'adminkey',
        role: 'admin'
      }
    }, res)
    expect(res.data).toBeDefined()
    expect(DAL.replaceTeam).toHaveBeenCalledWith('teamKey', jasmine.objectContaining({
      name: 'testTeam',
      invitationCode: jasmine.any(String),
      invitationExpiry: jasmine.any(Date)
    }))
  })

  it('teams can be retrieved by admin', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'teamKey',
      name: 'testTeam'
    }])

    let res = new MockResponse()
    await teamsCtrl.getAll({
      user: {
        _key: 'adminkey',
        role: 'admin'
      }
    }, res)
    expect(res.data).toBeDefined()
    expect(DAL.getAllTeams).toHaveBeenCalled()
  })

  it('teams can be retrieved by researcher', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'teamKey',
      name: 'testTeam'
    }])

    let res = new MockResponse()
    await teamsCtrl.getAll({
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      }
    }, res)
    expect(res.data).toBeDefined()
    expect(DAL.getAllTeams).toHaveBeenCalledWith('researcherKey')
  })

  it('a single team can be retrieved by researcher', async () => {
    spyOn(DAL, 'getOneTeam').and.returnValue([{
      _key: 'teamKey',
      name: 'testTeam'
    }])

    let res = new MockResponse()
    await teamsCtrl.getTeamByKey({
      params: {
        teamKey: 'teamKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      }
    }, res)
    expect(res.data).toBeDefined()
    expect(DAL.getOneTeam).toHaveBeenCalledWith('teamKey')
  })

  it('a researcher can be added to a team', async () => {
    spyOn(jwt, 'verify').and.returnValue({
      exp: (Date.now() / 1000) + 500,
      teamKey: 'teamKey'
    })
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam',
      researchers: []
    })
    spyOn(DAL, 'addResearcherToTeam')

    let res = new MockResponse()
    await teamsCtrl.addResearcherToTeam({
      params: {
        teamKey: 'teamKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      body: {
        invitationCode: 'xxxx'
      }
    }, res)
    expect(res.data).toBeDefined()
    expect(jwt.verify).toHaveBeenCalledWith('xxxx', 'mysecretnotsosecret')
    expect(DAL.getOneTeam).toHaveBeenCalledWith('teamKey')
    expect(DAL.addResearcherToTeam).toHaveBeenCalledWith('teamKey', 'researcherKey')
  })

  it('a researcher cannot be added if already added', async () => {
    spyOn(jwt, 'verify').and.returnValue({
      exp: (Date.now() / 1000) + 500,
      teamKey: 'teamKey'
    })
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam',
      researchers: [{
        userKey: 'researcherKey'
      }]
    })
    spyOn(DAL, 'addResearcherToTeam')

    let res = new MockResponse()
    await teamsCtrl.addResearcherToTeam({
      params: {
        teamKey: 'teamKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      body: {
        invitationCode: 'xxxx'
      }
    }, res)
    expect(res.code).toBe(409)
  })

  it('a researcher can be removed from a team', async () => {
    spyOn(jwt, 'verify').and.returnValue({
      exp: (Date.now() / 1000) + 500,
      teamKey: 'teamKey'
    })
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam',
      researchers: [{
        userKey: 'researcherKey'
      }]
    })
    spyOn(DAL, 'removeResearcherFromTeam')

    let res = new MockResponse()
    await teamsCtrl.removeResearcherFromTeam({
      params: {
        teamKey: 'teamKey'
      },
      user: {
        _key: 'adminKey',
        role: 'admin'
      },
      body: {
        userRemoved: {
          teamKey: 'teamKey',
          userKey: 'researcherKey'
        }
      }
    }, res)
    expect(DAL.removeResearcherFromTeam).toHaveBeenCalledWith('teamKey', 'researcherKey')
  })

  it('a researcher can update the study options in a team', async () => {
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam',
      researchers: [{
        userKey: 'researcherKey'
      }]
    })
    spyOn(DAL, 'addResearcherToTeam')

    let res = new MockResponse()
    await teamsCtrl.updateResearcherStudyOptionsInTeam({
      params: {
        teamKey: 'teamKey',
        studyKey: 'studyKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      body: { preferredParticipantsKeys: ['fakePartcipant'] }
    }, res)
    expect(res.code).toBe(200)
    expect(DAL.addResearcherToTeam).toHaveBeenCalledWith('teamKey', 'researcherKey', 'studyKey', jasmine.objectContaining({ preferredParticipantsKeys: ['fakePartcipant'] }))
  })

  it('a researcher cannot update study options in a team he does not belong to', async () => {
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam',
      researchers: [{
        userKey: 'anotherResearcherKey'
      }]
    })
    spyOn(DAL, 'addResearcherToTeam')

    let res = new MockResponse()
    await teamsCtrl.updateResearcherStudyOptionsInTeam({
      params: {
        teamKey: 'teamKey',
        studyKey: 'studyKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      body: { preferredParticipantsKeys: ['fakePartcipant'] }
    }, res)
    expect(res.code).toBe(403)
    expect(DAL.addResearcherToTeam).not.toHaveBeenCalled()
  })

  it('a researcher can add a preferred participant', async () => {
    spyOn(DAL, 'getStudyByKey').and.returnValue({
      _key: 'studyKey',
      teamKey: 'teamKey'
    })
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam',
      researchers: [{
        userKey: 'researcherKey'
      }]
    })
    spyOn(DAL, 'addResearcherToTeam')

    let res = new MockResponse()
    await teamsCtrl.updateResearcherPreferredParticipantInTeam({
      params: {
        studyKey: 'studyKey',
        participantUserKey: 'partUserKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      body: { isPreferred: true }
    }, res)
    expect(res.code).toBe(200)
    expect(DAL.addResearcherToTeam).toHaveBeenCalledWith('teamKey', 'researcherKey', 'studyKey',
      jasmine.objectContaining({ preferredParticipantsKeys: ['partUserKey'] }))
  })

  it('a researcher can remove a preferred participant', async () => {
    spyOn(DAL, 'getStudyByKey').and.returnValue({
      _key: 'studyKey',
      teamKey: 'teamKey'
    })
    spyOn(DAL, 'getOneTeam').and.returnValue({
      _key: 'teamKey',
      name: 'testTeam',
      researchers: [{
        userKey: 'researcherKey',
        studiesOptions: [
          {
            studyKey: 'studyKey',
            preferredParticipantsKeys: [
              'partUserKey',
              'anotherPartUserKey'
            ]
          },
          {
            studyKey: 'anotherStudyKey'
          }
        ]
      }]
    })
    spyOn(DAL, 'addResearcherToTeam')

    let res = new MockResponse()
    await teamsCtrl.updateResearcherPreferredParticipantInTeam({
      params: {
        studyKey: 'studyKey',
        participantUserKey: 'partUserKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      body: { isPreferred: false }
    }, res)
    expect(res.code).toBe(200)
    expect(DAL.addResearcherToTeam).toHaveBeenCalledWith('teamKey', 'researcherKey', 'studyKey',
      jasmine.objectContaining({ preferredParticipantsKeys: ['anotherPartUserKey'] }))
  })


})
