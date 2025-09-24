/**
* Sets-up the authentication strategy.
*/
import passport from 'passport'
import PassportLocal from 'passport-local'
import PassportJWT from 'passport-jwt'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { applogger } from './logger.mjs'
import { DAL } from '../DAL/DAL.mjs'

export default async function () {

  if (process.env.AUTH_ADMIN_EMAIL && process.env.AUTH_ADMIN_PASSWORD) {
    // generate admin user from env if not already existing
    try {
      const admin = await DAL.findUserByEmail(process.env.AUTH_ADMIN_EMAIL)
      if (!admin) {
        await DAL.createUser({
          email: process.env.AUTH_ADMIN_EMAIL,
          hashedPassword: bcrypt.hashSync(process.env.AUTH_ADMIN_PASSWORD, 8),
          role: 'admin'
        })
        applogger.info('Admin user created')
      } else {
        applogger.debug('Admin user already exists')
      }
    } catch (err) {
      applogger.fatal(err, 'Cannot create admin user')
      process.exit(1)
    }
  }

  // This is used for authenticating with a post
  passport.use(new PassportLocal({
    usernameField: 'email',
    passwordField: 'password'
  }, async function (email, password, done) {
    const user = await DAL.findUserByEmail(email)
    if (!user) {
      applogger.trace(email + ' is trying to login, but is not registered')
      return done(null, false, { message: 'Incorrect email or password.' })
    } else {
      const dbHashedPwd = user.hashedPassword
      if (bcrypt.compareSync(password, dbHashedPwd)) {
        // OK!
        applogger.info({ email: email }, 'User has logged in')
        delete user.hashedPassword
        delete user._rev
        delete user._id
        const token = jwt.sign(user, process.env.AUTH_SECRET, {
          expiresIn: process.env.AUTH_TOKEN_EXPIRES
        })
        user.token = token
        return done(null, user, { message: 'Logged In Successfully' })
      } else {
        // wrong password!
        applogger.debug(email + 'is trying to login, but wrong password')
        return done(null, false, { message: 'Incorrect email or password.' })
      }
    }
  }))

  // this is used each time an API endpoint is called
  const opts = {}
  opts.jwtFromRequest = PassportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()
  opts.secretOrKey = process.env.AUTH_SECRET
  passport.use(new PassportJWT.Strategy(opts, function (jwtPayload, cb) {
    const user = jwtPayload
    delete user.exp
    delete user.iat
    return cb(null, user)
  }))
}
