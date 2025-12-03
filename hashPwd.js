import bcrypt from 'bcrypt'
import readline from 'readline'

const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

cli.question('Password? ', pwd => {
  let hashedPwd = bcrypt.hashSync(pwd, 8)
  console.log(`Hashed password: ${hashedPwd}`)
  cli.close()
})
