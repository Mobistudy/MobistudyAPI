/**
* This allows email to be structured and sent to participants wrt studies.
*/
import { DAO } from '../DAO/DAO.mjs'
import i18n from '../i18n/i18n.mjs'

// creates the email when a user registers
// returns { title: '...', content: '...'}
export function userRegistrationCompose (language) {
  i18n.locale = language
  const title = i18n.t('account.registrationTitle')
  const content = i18n.t('account.registrationContent')
  return { title: title, content: content }
}

// creates the email when a user requests password recovery
// returns { title: '...', content: '...'}
export function passwordRecoveryCompose (serverlink, token, language) {
  i18n.locale = language

  const title = i18n.t('account.passwordRecoveryTitle')
  const content = i18n.t('account.passwordRecoveryContent', { serverlink: serverlink, token: token })
  return { title: title, content: content }
}

// creates the email when a user sets a new password
// returns { title: '...', content: '...'}
export function newPasswordCompose (language) {
  i18n.locale = language

  const title = i18n.t('account.newPasswordTitle')
  const content = i18n.t('account.newPasswordContent')
  return { title: title, content: content }
}

// Creates the content of an email to be sent to a user when the status of a study changes
// returns { title: '...', content: '...'}
export async function studyStatusUpdateCompose (studyKey, participant) {
  const study = await DAO.getOneStudy(studyKey)
  i18n.locale = participant.language
  const studyTitle = study.generalities.title[participant.language]
  let emailTitle = ''
  let emailContent = ''
  let taskConDesc = ''
  let taskNotConDesc = ''

  // get the participant's role in this study
  const partStudy = participant.studies.find(s => s.studyKey === studyKey)

  // Send EMAILS according to status
  if (partStudy.currentStatus === 'accepted') {
    emailTitle = i18n.t('studyStatusUpdate.studyAcceptedTitle', { studyTitle: studyTitle })
    emailContent = '<p>' + i18n.t('studyStatusUpdate.studyAcceptedThanks', { studyTitle: studyTitle }) + '</p>'
    // If there are consented task items, get them from study
    if (partStudy.taskItemsConsent.length !== 0 || partStudy.extraItemsConsent.length !== 0) {
      for (let i = 0; i < partStudy.taskItemsConsent.length; i++) {
        const taskID = partStudy.taskItemsConsent[i].taskId
        // get description of task from study description using ID
        const descr = ' <li> ' + study.consent.taskItems.find(t => t.taskId == taskID).description[participant.language] + ' </li> \n'
        if (partStudy.taskItemsConsent[i].consented === true) taskConDesc += descr
        else taskNotConDesc += descr
      }
      for (let i = 0; i < partStudy.extraItemsConsent.length; i++) {
        const descr = ' <li> ' + study.consent.extraItems[i].description[participant.language] + ' </li> \n'
        if (partStudy.extraItemsConsent[i].consented) taskConDesc += descr
        else taskNotConDesc += descr
      }

      emailContent += '\n\n'
      emailContent += '<p>' + i18n.t('studyStatusUpdate.studyAcceptedConsentedTasks') + '</p>'
      emailContent += '\n <ul> \n'
      emailContent += taskConDesc
      emailContent += ' </ul> \n'
      if (taskNotConDesc) {
        emailContent += '<p>' + i18n.t('studyStatusUpdate.studyAcceptedNotConsentedTasks') + '</p>'
        emailContent += '\n <ul> \n'
        emailContent += taskNotConDesc
        emailContent += ' </ul> \n'
      }
    }
  }
  if (partStudy.currentStatus === 'completed') {
    emailTitle = i18n.t('studyStatusUpdate.studyCompletedTitle', { studyTitle: studyTitle })
    emailContent = '<p>' + i18n.t('studyStatusUpdate.studyCompletedThanks', { studyTitle: studyTitle }) + '</p>'
  }
  if (partStudy.currentStatus === 'withdrawn') {
    emailTitle = i18n.t('studyStatusUpdate.studyWithdrawnTitle', { studyTitle: studyTitle })
    emailContent = '<p>' + i18n.t('studyStatusUpdate.studyWithdrawnThanks', { studyTitle: studyTitle }) + '</p>'
  }
  return { title: emailTitle, content: emailContent }
}
