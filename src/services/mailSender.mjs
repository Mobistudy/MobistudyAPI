import getConfig from './config.mjs'
import { applogger } from './logger.mjs'
import nodemailer from 'nodemailer'

const config = getConfig()

export async function sendEmail (contact, subject, message) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com', // hostname
      secureConnection: false, // TLS requires secureConnection to be false
      port: 587, // port for secure SMTP
      tls: {
        ciphers: 'SSLv3'
      },
      auth: {
        user: config.outlook.user,
        pass: config.outlook.password
      }
    })

    const strippedHtml = message.replace(/<[^>]+>/g, '')

    const mailOptions = {
      from: config.outlook.email, // sender address (who sends)
      to: contact, // list of receivers (who receives)
      subject: subject, // Subject line
      text: strippedHtml, // plaintext body
      html: message // html body
    }

    applogger.debug({ contact, subject, message }, 'sending email')
    try {
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          reject(error)
          applogger.error(error, 'Cannot send email to ' + contact)
        } else {
          resolve()
          applogger.info('Email sent to ' + contact)
        }
      })
    } catch (error) {
      reject(error)
      applogger.error(error, 'Cannot send email to ' + contact)
    }
  })
}
