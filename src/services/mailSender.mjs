import { applogger } from './logger.mjs'
import nodemailer from 'nodemailer'


export default {
  sendEmail: async (contact, subject, message) => {
    return new Promise((resolve, reject) => {

      if (process.env.SMTP_DISABLED === 'true') {
        console.log(`FAKE SMTP: sending email with subject: "${subject}", message: "${message}"`)
        resolve()
        return
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_SERVER, // hostname
        secureConnection: false, // TLS requires secureConnection to be false
        port: 587, // port for secure SMTP
        tls: {
          ciphers: 'SSLv3'
        },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      })

      const strippedHtml = message.replace(/<[^>]+>/g, '')

      const mailOptions = {
        from: process.env.SMTP_EMAIL, // sender address (who sends)
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
}
