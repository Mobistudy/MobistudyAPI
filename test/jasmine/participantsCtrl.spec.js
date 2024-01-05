import participantsCtrl from '../../src/controllers/participantsCtrl.mjs'
import { DAL } from '../../src/DAL/DAL.mjs'
import { applogger } from '../../src/services/logger.mjs'
import auditLogger from '../../src/services/auditLogger.mjs'
import mailSender from '../../src/services/mailSender.mjs'
import { MockResponse } from '../mocks/MockResponse.mjs'

describe('Testing participants controller,', () => {

  beforeAll(async () => {
    // extend the DAL object
    await DAL.extendDAL()

    spyOnAllFunctions(applogger)
    spyOnAllFunctions(auditLogger)
    spyOnAllFunctions(mailSender)
  }, 100)

  it('participant creates participant and key is the one of the creator', async () => {
    spyOn(DAL, 'createParticipant').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    })

    let res = new MockResponse()
    await participantsCtrl.createParticipant({
      body: {
        name: 'Dario',
        userKey: 'wrongKey'
      },
      user: {
        role: 'participant',
        _key: 'partUserKey'
      }
    }, res)

    expect(res.code).not.toBe(403)
    expect(res.data).toEqual(jasmine.objectContaining({ name: 'Dario', userKey: 'partUserKey' }))
    expect(DAL.createParticipant).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Dario', userKey: 'partUserKey' }))
  })

  it('participant gets himself', async () => {
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'participant',
        _key: 'partUserKey'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(res.data[0]).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getParticipantByUserKey).toHaveBeenCalledWith('partUserKey')
  })

  it('admin gets all', async () => {
    spyOn(DAL, 'getAllParticipants').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'admin',
        _key: 'adminUserKey'
      },
      query: {}
    }, res)

    expect(res.data.length).toBe(1)
    expect(res.data[0]).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getAllParticipants).toHaveBeenCalled()
  })

  it('admin can filter by status', async () => {
    spyOn(DAL, 'getAllParticipants').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'admin',
        _key: 'adminUserKey'
      },
      query: {
        currentStatus: 'accepted'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(res.data[0]).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getAllParticipants).toHaveBeenCalledWith('accepted', null)
  })

  it('admin can filter by study', async () => {
    spyOn(DAL, 'getAllParticipants').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'admin',
        _key: 'adminUserKey'
      },
      query: {
        studyKey: 'studyKey'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(res.data[0]).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getAllParticipants).toHaveBeenCalledWith(null, 'studyKey')
  })

  it('admin can filter by team', async () => {
    spyOn(DAL, 'getParticipantsByTeam').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'admin',
        _key: 'adminUserKey'
      },
      query: {
        teamKey: 'teamKey'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(res.data[0]).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getParticipantsByTeam).toHaveBeenCalledWith('teamKey', null, null)
  })

  it('admin can filter by team and study', async () => {
    spyOn(DAL, 'getParticipantsByTeam').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'admin',
        _key: 'adminUserKey'
      },
      query: {
        teamKey: 'teamKey',
        studyKey: 'studyeKey'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(res.data[0]).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getParticipantsByTeam).toHaveBeenCalledWith('teamKey', 'studyeKey', null)
  })

  it('researcher cannot get team they are not in', async () => {
    spyOn(DAL, 'getOneTeam').and.returnValue({
      researchers: [
        { userKey: '123456' }
      ]
    })

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'researcher',
        _key: 'researcherKey'
      },
      query: {
        teamKey: 'teamKey'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('researcher cannot get study they are not in', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'researcher',
        _key: 'researcherKey'
      },
      query: {
        studyKey: 'studyKey'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('researcher can get participants of study they are in', async () => {
    spyOn(DAL, 'getAllTeams').and.returnValue([{
      researchers: [
        { userKey: 'researcherKey' }
      ]
    }])
    spyOn(DAL, 'getParticipantsByResearcher').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'researcher',
        _key: 'researcherKey'
      },
      query: {
        studyKey: 'studyKey'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(DAL.getParticipantsByResearcher).toHaveBeenCalledWith('researcherKey', null, false, null)
  })

  it('researcher can get participants of team they are in', async () => {
    spyOn(DAL, 'getOneTeam').and.returnValue({
      researchers: [
        { userKey: 'researcherKey' }
      ]
    })
    spyOn(DAL, 'getParticipantsByResearcher').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'researcher',
        _key: 'researcherKey'
      },
      query: {
        teamKey: 'teamKey'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(DAL.getParticipantsByResearcher).toHaveBeenCalledWith('researcherKey', null, false, 'teamKey')
  })

  it('researcher can get participants by status', async () => {
    spyOn(DAL, 'getParticipantsByResearcher').and.returnValue([{
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    }])

    let res = new MockResponse()
    await participantsCtrl.getAll({
      body: {},
      user: {
        role: 'researcher',
        _key: 'researcherKey'
      },
      query: {
        currentStatus: 'accepted'
      }
    }, res)

    expect(res.data.length).toBe(1)
    expect(DAL.getParticipantsByResearcher).toHaveBeenCalledWith('researcherKey', 'accepted', false, null)
  })

  it('participant gets herself with participantKey', async () => {
    spyOn(DAL, 'getOneParticipant').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    })

    let res = new MockResponse()
    await participantsCtrl.getParticipantByKey({
      body: {},
      user: {
        role: 'participant',
        _key: 'partUserKey'
      },
      params: {
        participantKey: 'partKey'
      }
    }, res)

    expect(res.code).not.toBe(403)
    expect(res.data).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getOneParticipant).toHaveBeenCalledWith('partKey')
  })

  it('participant cannot get someone else participantKey', async () => {
    spyOn(DAL, 'getOneParticipant').and.returnValue({
      _key: 'partKey',
      userKey: 'part2UserKey',
      name: 'Dario'
    })

    let res = new MockResponse()
    await participantsCtrl.getParticipantByKey({
      body: {},
      user: {
        role: 'participant',
        _key: 'partUserKey'
      },
      params: {
        participantKey: 'part2Key'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('researcher gets a participant with participantKey', async () => {
    spyOn(DAL, 'getOneParticipant').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    })
    spyOn(DAL, 'hasResearcherParticipant').and.returnValue(true)

    let res = new MockResponse()
    await participantsCtrl.getParticipantByKey({
      body: {},
      user: {
        role: 'researcher',
        _key: 'userKey'
      },
      params: {
        participantKey: 'partKey'
      }
    }, res)

    expect(res.code).not.toBe(403)
    expect(res.data).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getOneParticipant).toHaveBeenCalledWith('partKey')
    expect(DAL.hasResearcherParticipant).toHaveBeenCalledWith('userKey', null, 'partKey')
  })

  it('admin gets a participant with participantKey', async () => {
    spyOn(DAL, 'getOneParticipant').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    })

    let res = new MockResponse()
    await participantsCtrl.getParticipantByKey({
      body: {},
      user: {
        role: 'admin',
        _key: 'userKey'
      },
      params: {
        participantKey: 'partKey'
      }
    }, res)

    expect(res.code).not.toBe(403)
    expect(res.data).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getOneParticipant).toHaveBeenCalledWith('partKey')
  })

  it('if participant does nto exist we get 404', async () => {
    spyOn(DAL, 'getOneParticipant').and.returnValue(undefined)

    let res = new MockResponse()
    await participantsCtrl.getParticipantByKey({
      body: {},
      user: {
        role: 'admin',
        _key: 'userKey'
      },
      params: {
        participantKey: 'inexistentPartKey'
      }
    }, res)

    expect(res.code).toBe(404)
  })

  it('admin gets a participant with userkey', async () => {
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    })

    let res = new MockResponse()
    await participantsCtrl.getParticipantByUserKey({
      body: {},
      user: {
        role: 'admin',
        _key: 'userKey'
      },
      params: {
        participantUserKey: 'partUserKey'
      }
    }, res)

    expect(res.code).not.toBe(404)
    expect(res.data).toEqual(jasmine.objectContaining({ name: 'Dario' }))
    expect(DAL.getParticipantByUserKey).toHaveBeenCalledWith('partUserKey')
  })

  it('researcher cannot get a participant by user key if not linked', async () => {
    spyOn(DAL, 'hasResearcherParticipant').and.returnValue(false)

    let res = new MockResponse()
    await participantsCtrl.getParticipantByUserKey({
      body: {},
      user: {
        role: 'researcher',
        _key: 'userKey'
      },
      params: {
        participantUserKey: 'partUserKey'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('participant cannot get another participant by user key', async () => {
    let res = new MockResponse()
    await participantsCtrl.getParticipantByUserKey({
      body: {},
      user: {
        role: 'participant',
        _key: 'userKey'
      },
      params: {
        participantUserKey: 'part1UserKey'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('admin can delete a participant with its key', async () => {
    spyOn(DAL, 'getOneParticipant').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    })
    spyOn(DAL, 'startTransaction').and.returnValue({
      commit () { }
    })
    spyOn(DAL, 'deleteTasksResultsByUserKey')
    spyOn(DAL, 'deleteLogsByUserKey')
    spyOn(DAL, 'removeParticipant')
    spyOn(DAL, 'removeUser')

    let res = new MockResponse()
    await participantsCtrl.deleteParticipant({
      body: {},
      user: {
        role: 'admin',
        _key: 'userKey'
      },
      params: {
        participantKey: 'partKey'
      }
    }, res)

    expect(res.code).not.toBe(404)
    expect(res.code).not.toBe(403)
    expect(DAL.getOneParticipant).toHaveBeenCalledWith('partKey')
    expect(DAL.deleteTasksResultsByUserKey).toHaveBeenCalledWith('partUserKey', jasmine.anything())
    expect(DAL.deleteLogsByUserKey).toHaveBeenCalledWith('partUserKey', jasmine.anything())
    expect(DAL.removeParticipant).toHaveBeenCalledWith('partKey', jasmine.anything())
    expect(DAL.removeUser).toHaveBeenCalledWith('partUserKey', jasmine.anything())
  })

  it('admin can delete a participant with its user key', async () => {
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario'
    })
    spyOn(DAL, 'startTransaction').and.returnValue({
      commit () { }
    })
    spyOn(DAL, 'deleteTasksResultsByUserKey')
    spyOn(DAL, 'deleteLogsByUserKey')
    spyOn(DAL, 'removeParticipant')
    spyOn(DAL, 'removeUser')

    let res = new MockResponse()
    await participantsCtrl.deleteParticipant({
      body: {},
      user: {
        role: 'admin',
        _key: 'userKey'
      },
      params: {
        participantUserKey: 'partUserKey'
      }
    }, res)

    expect(res.code).not.toBe(404)
    expect(res.code).not.toBe(403)
    expect(DAL.getParticipantByUserKey).toHaveBeenCalledWith('partUserKey')
    expect(DAL.deleteTasksResultsByUserKey).toHaveBeenCalledWith('partUserKey', jasmine.anything())
    expect(DAL.deleteLogsByUserKey).toHaveBeenCalledWith('partUserKey', jasmine.anything())
    expect(DAL.removeParticipant).toHaveBeenCalledWith('partKey', jasmine.anything())
    expect(DAL.removeUser).toHaveBeenCalledWith('partUserKey', jasmine.anything())
  })

  it('researcher cannot change participant profile', async () => {
    let res = new MockResponse()
    await participantsCtrl.updateParticipantProfile({
      body: {},
      user: {
        role: 'researcher',
        _key: 'userKey'
      },
      params: {
        userKey: 'partUserKey'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('participant can update own profile', async () => {
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      sex: 'male'
    })
    spyOn(DAL, 'updateParticipant').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      sex: 'female'
    })

    let res = new MockResponse()
    await participantsCtrl.updateParticipantProfile({
      body: {
        name: 'Dario',
        sex: 'female'
      },
      user: {
        role: 'participant',
        _key: 'partUserKey'
      },
      params: {
        participantUserKey: 'partUserKey'
      }
    }, res)

    expect(res.code).not.toBe(404)
    expect(res.code).not.toBe(403)
    expect(DAL.updateParticipant).toHaveBeenCalledWith('partKey', jasmine.objectContaining({ name: 'Dario', sex: 'female' }))
  })

  it('participant cannot update someone else profile', async () => {
    let res = new MockResponse()
    await participantsCtrl.updateParticipantProfile({
      body: {
        name: 'Dario',
        sex: 'female'
      },
      user: {
        role: 'participant',
        _key: 'partUserKey'
      },
      params: {
        participantUserKey: 'part1UserKey'
      }
    }, res)

    expect(res.code).toBe(403)
  })

  it('participant can add study status', async () => {
    spyOn(DAL, 'getOneUser').and.returnValue({
      _key: 'partUserKey',
      role: 'participant'
    })
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      studies: []
    })
    spyOn(DAL, 'updateParticipant')

    let res = new MockResponse()
    await participantsCtrl.updateParticipantStudyStatus({
      body: {
        currentStatus: 'accepted',
        acceptedTS: '2024-01-02T10:00:00'
      },
      user: {
        role: 'participant',
        _key: 'partUserKey'
      },
      params: {
        participantUserKey: 'partUserKey',
        studyKey: 'studyKey'
      }
    }, res)

    expect(res.code).not.toBe(404)
    expect(res.code).not.toBe(403)
    expect(DAL.updateParticipant).toHaveBeenCalledWith('partKey', jasmine.objectContaining({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      studies: jasmine.arrayContaining([{
        studyKey: 'studyKey',
        currentStatus: 'accepted',
        acceptedTS: '2024-01-02T10:00:00'
      }])
    }))
  })

  it('participant can update study status', async () => {
    spyOn(DAL, 'getOneUser').and.returnValue({
      _key: 'partUserKey',
      role: 'participant'
    })
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      studies: [
        {
          studyKey: 'studyKey',
          currentStatus: 'accepted',
          acceptedTS: '2024-01-02T10:00:00'
        }
      ]
    })
    spyOn(DAL, 'updateParticipant')

    let res = new MockResponse()
    await participantsCtrl.updateParticipantStudyStatus({
      body: {
        currentStatus: 'withdrawn',
        withdrawalTS: '2024-01-02T10:00:00'
      },
      user: {
        role: 'participant',
        _key: 'partUserKey'
      },
      params: {
        participantUserKey: 'partUserKey',
        studyKey: 'studyKey'
      }
    }, res)

    expect(res.code).not.toBe(404)
    expect(res.code).not.toBe(403)
    expect(DAL.updateParticipant).toHaveBeenCalledWith('partKey', jasmine.objectContaining({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      studies: jasmine.arrayContaining([{
        studyKey: 'studyKey',
        currentStatus: 'withdrawn',
        acceptedTS: '2024-01-02T10:00:00',
        withdrawalTS: '2024-01-02T10:00:00'
      }])
    }))
  })

  it('participant can update study task status', async () => {
    spyOn(DAL, 'getParticipantByUserKey').and.returnValue({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      studies: [
        {
          studyKey: 'studyKey',
          currentStatus: 'accepted',
          acceptedTS: '2024-01-02T10:00:00',
          taskItemsConsent: [
            {
              taskId: 1,
              consented: true,
              lastExecuted: "2024-01-10T11:12:00"
            }
          ]
        }
      ]
    })
    spyOn(DAL, 'updateParticipant')

    let res = new MockResponse()
    await participantsCtrl.updateParticipantStudyTaskStatus({
      body: {
        taskId: 1,
        consented: true,
        lastExecuted: "2024-01-12T09:30:00"
      },
      user: {
        role: 'participant',
        _key: 'partUserKey'
      },
      params: {
        participantUserKey: 'partUserKey',
        studyKey: 'studyKey',
        taskId: '1'
      }
    }, res)

    expect(res.code).not.toBe(404)
    expect(res.code).not.toBe(403)
    expect(DAL.updateParticipant).toHaveBeenCalledWith('partKey', jasmine.objectContaining({
      _key: 'partKey',
      userKey: 'partUserKey',
      name: 'Dario',
      studies: jasmine.arrayContaining([{
        studyKey: 'studyKey',
        currentStatus: 'accepted',
        acceptedTS: '2024-01-02T10:00:00',
        taskItemsConsent: [{
          taskId: 1,
          consented: true,
          lastExecuted: "2024-01-12T09:30:00"
        }]
      }])
    }))
  })
})
