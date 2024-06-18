import studiesCtrl from '../../src/controllers/studiesCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import auditLogger from '../../src/services/auditLogger.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'
import * as attachments from '../../src/services/attachments.mjs'

describe('Testing studies controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    spyOnAllFunctions(applogger)
    spyOnAllFunctions(auditLogger)

    // await teamsCtrl.init()

    // mock schema validation
    studiesCtrl.validate = () => { return true }
  }, 100)


  it('only researcher can create a study', async () => {
    let res = new MockResponse()
    await studiesCtrl.createStudy({
      body: {
        name: 'testTeam'
      },
      user: {
        role: 'admin'
      }
    }, res)
    expect(res.code).toBe(403)
  })


  it('researcher creates a study', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'myTeam'
    }])
    spyOn(DAL, 'createStudy').and.returnValue({
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    })

    let res = new MockResponse()
    await studiesCtrl.createStudy({
      body: {
        name: 'testStudy',
        teamKey: 'myTeam',
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      }
    }, res)
    expect(res.code).not.toBe(500)
    expect(res.code).not.toBe(403)
    expect(DAL.createStudy).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'testStudy' }))
  })

  it('researcher can create a study only with right team key', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'myTeam'
    }])

    let res = new MockResponse()
    await studiesCtrl.createStudy({
      body: {
        name: 'testStudy',
        teamKey: 'anotherTeamKey',
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      }
    }, res)
    expect(res.code).toBe(403)
  })

  it('researcher can replace own study', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'myTeam'
    }])
    spyOn(DAL, 'replaceStudy').and.returnValue({
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    })

    let res = new MockResponse()
    await studiesCtrl.replaceStudy({
      body: {
        name: 'testStudy',
        teamKey: 'myTeam',
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      params: {
        study_key: 'studyKey'
      }
    }, res)
    expect(res.code).not.toBe(403)
    expect(DAL.replaceStudy).toHaveBeenCalled()
  })

  it('researcher cannot replace a study with wrong team', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'myTeam'
    }])

    let res = new MockResponse()
    await studiesCtrl.replaceStudy({
      body: {
        name: 'testStudy',
        teamKey: 'anotherTeamKey',
      },
      params: {
        study_key: 'studyKey'
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      }
    }, res)
    expect(res.code).toBe(403)
  })

  it('researcher can udpate own study', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'myTeam'
    }])
    spyOn(DAL, 'updateStudy').and.returnValue({
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    })

    let res = new MockResponse()
    await studiesCtrl.updateStudy({
      body: {
        name: 'testStudy',
        teamKey: 'myTeam',
      },
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      params: {
        study_key: 'studyKey'
      }
    }, res)
    expect(res.code).not.toBe(403)
    expect(DAL.updateStudy).toHaveBeenCalled()
  })

  it('researcher can get a study only with right team key', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      _key: 'myTeam'
    }])

    let res = new MockResponse()
    await studiesCtrl.getStudies({
      user: {
        _key: 'researcherKey',
        role: 'researcher'
      },
      query: {
        teamKey: 'anotherTeamKey'
      }
    }, res)
    expect(res.code).toBe(403)
  })

  it('participants can access any study', async () => {
    spyOn(DAL, 'getStudies').and.returnValue([{
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    }])

    let res = new MockResponse()
    await studiesCtrl.getStudies({
      user: {
        _key: 'participantKey',
        role: 'participant'
      },
      query: {}
    }, res)
    expect(res.code).not.toBe(500)
    expect(res.code).not.toBe(403)
    expect(DAL.getStudies).toHaveBeenCalled()
  })

  it('participants can access own studies', async () => {
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'participantKey'
    })
    spyOn(DAL, 'getStudies').and.returnValue([{
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    }])

    let res = new MockResponse()
    await studiesCtrl.getStudies({
      user: {
        _key: 'userKey',
        role: 'participant'
      },
      query: {
        participantKey: 'participantKey'
      }
    }, res)
    expect(res.code).not.toBe(500)
    expect(res.code).not.toBe(403)
    expect(DAL.getStudies).toHaveBeenCalled()
  })

  it('participants cannot access others studies', async () => {
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'participantKey'
    })

    let res = new MockResponse()
    await studiesCtrl.getStudies({
      user: {
        _key: 'userKey',
        role: 'participant'
      },
      query: {
        participantKey: 'anotherParticipantKey'
      }
    }, res)
    expect(res.code).toBe(403)
  })

  it('one can get a study by key', async () => {
    spyOn(DAL, 'getOneStudy').and.returnValue({
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    })

    let res = new MockResponse()
    await studiesCtrl.getOneStudy({
      user: {
        _key: 'userKey',
        role: 'participant'
      },
      params: {
        study_key: 'studyKey'
      }
    }, res)
    expect(res.code).not.toBe(403)
    expect(DAL.getOneStudy).toHaveBeenCalled()
  })

  it('participant can get new studies', async () => {
    spyOn(DAL, 'getMatchedNewStudies').and.returnValue([{
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    }])

    let res = new MockResponse()
    await studiesCtrl.getNewStudies({
      user: {
        _key: 'userKey',
        role: 'participant'
      }
    }, res)
    expect(res.code).not.toBe(403)
    expect(DAL.getMatchedNewStudies).toHaveBeenCalled()
  })

  it('researcher can get new invitation code', async () => {
    spyOn(DAL, 'getNewInvitationCode').and.returnValue('123456')

    let res = new MockResponse()
    await studiesCtrl.getNewInvitationCode({
      user: {
        _key: 'userKey',
        role: 'researcher'
      }
    }, res)
    expect(res.code).not.toBe(403)
    expect(DAL.getNewInvitationCode).toHaveBeenCalled()
    expect(res.data).toBe('123456')
  })

  it('study can be retrieved by invitation code', async () => {
    spyOn(DAL, 'getInvitationalStudy').and.returnValue({
      _key: 'studyKey',
      teamKey: 'myTeam',
      name: 'testStudy'
    })

    let res = new MockResponse()
    await studiesCtrl.getStudyByInvitationCode({
      user: {
        _key: 'userKey',
        role: 'researcher'
      },
      params: {
        invitationalCode: '123456'
      }
    }, res)
    expect(res.code).not.toBe(404)
    expect(DAL.getInvitationalStudy).toHaveBeenCalled()
  })

  it('a researcher can delete a study', async () => {
    spyOn(DAL, 'getParticipantsByStudy').and.returnValue([{
      _key: 'part1Key',
      studies: [{
        studyKey: 'studyKey'
      }]
    }])
    spyOn(DAL, 'startTransaction')
    spyOn(DAL, 'replaceParticipant')
    spyOn(DAL, 'deleteTasksResultsByStudy')
    spyOn(DAL, 'deleteStudy')
    spyOn(attachments, 'deleteAttachmentsByStudy')
    spyOn(DAL, 'endTransaction')


    let res = new MockResponse()
    await studiesCtrl.deleteStudy({
      user: {
        _key: 'userKey',
        role: 'admin'
      },
      params: {
        study_key: 'studyKey'
      }
    }, res)
    expect(res.code).not.toBe(404)
    expect(res.code).not.toBe(403)
    expect(DAL.replaceParticipant).toHaveBeenCalled()
    expect(DAL.deleteTasksResultsByStudy).toHaveBeenCalled()
    expect(DAL.deleteStudy).toHaveBeenCalled()
  })

})
