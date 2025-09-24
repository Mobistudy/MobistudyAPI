# MobistudyAPI

This is the back-end REST API of MobiStudy.

## Pre requisites

You need to install the following on your system:

- nodejs (see nvmrc for version)
- arango DB (v 3.10.7)

In order to guarantee that the same version of node is used across developers, it is recommendable to use [nvm](https://github.com/nvm-sh/nvm) and run `nvm install && nvm use` to switch to the node version used in this project.

Install all other dependencies with `npm install`.

On Arango, you must have created a dedicated database for Mobistudy, and, possibly,
also a dedicated user with its password.

To start Arango, you can either [install it](https://www.arangodb.com/), or use Docker. For development, you can use:
`docker run -e ARANGO_NO_AUTH=1 -p 127.0.0.1:8529:8529 --name mobiArango arangodb/arangodb:3.10.7`
to start a Docker container with Arango. You can then access the web interface on http://localhost:8529

### Configuration

For development, it is easier to create a configuration file, which must be named `.env` and placed under the root folder.
See .env.template under the root folder as an example.

You can remove CERT_KEY and CERT_FILE if you don't have an https certificate, and you can disable SMTP with SMTP_DISABLED=true and the environment APIs (open weather and Ambee) with ENVAPIS_DISABLED=true, if you don't want to use them (especially in testing).

The AUTH_ADMIN_EMAIL and AUTH_ADMIN_PASSWORD configure the admin user of the server, you can specify the email address and password that you like.
The LOGS_ part is for setting up the logging system, use LOGS_FOLDER to set the folder where logfiles will be written, LOGS_ROTATIONSIZE for rotating files whenever they reach a certain size, LOGS_CONSOLE if you want to print also on console (recommended when testing), LOGS_LEVEL to specify a level, as a number (see [pino](https://getpino.io/#/)), use LOGHTTP=true if you want to log every HTTP call (warning: if the system runs on Docker this is pointless, plus it can leak sensitive information in the logfile).

The part starting with DB_ is important and is linked to how you configure Arango.
Your Arango instance should have a user and a database dedicated to Mobsitudy.
Once Arango is started, open the interface at http://127.0.0.1:8529, then login using the root user. If you used used ARANGO_NO_AUTH, no password should be needed.

Once inside, create a new user (you can call it “mobistudy”) and a new database (you can also call it “mobistudy”) and associate the new database to the new user. These details (database name, user name and the user password) are the same that you need to specify in .env file with the variables that DB_NAME, DB_USER and DB_PASSWORD.

## Run

The code is written using ES6 module, so you need a recent version of NodeJS (recommended version is 20.14.0, use [nvm](https://github.com/nvm-sh/nvm) to automatically switch among versions).
To start it:

    npm start

You also need to provide either a configuration file with the name `.env` or provide the same configuration as environment variables.

See section about Docker for details about environmental variables.

## Test

You need to have a testing database running either as local install or as docker container, exposed at the port number 5555.
For example, using docker:
`docker run -e ARANGO_NO_AUTH=1 -d -p 127.0.0.1:5555:8529 --name mobiTestsDB arangodb/arangodb:3.10.3`

Run `npm run test`. If you want to have the tests run continuously (as you
change the code), run `npm run test:watch`.

## Develop

The code is written mostly in ES6 and uses ES6 modules, please be consistent.

The folder structure follows this pattern:
```
project
└───logs                    // used to store applications logs
└───models                  // json schema of the data managed at the API interfaces
│   └───examples            // example of data
└───src                     // application code
│   └───DAO                 // access to the database
│   └───i18n                // internationalised text
│   │   └───en              // English text
│   │   └───sv              // Swedish text
│   │   └───es              // Spanish text
│   │   └───it              // Italian text
│   └───controllers         // controllers of the API endpoints
│   └───routes              // API endpoints - controllers combined
│   └───services            // application logic
└───tasksuploads            // stores raw data of the tasks
└───test                    // automatic tests and experiments
│   └───jasmine             // unit tests specs
│   └───mocks               // mocked objects
└───tmp                     // used to store data to be downloaded temporarily

```

Run `npm run dev` to start a self-restarting server.

By default, the server runs on http. In some cases you may need to use https on a local testing environment, in this case, follow [this tutorial](https://javascript.plainenglish.io/enable-https-for-localhost-during-local-development-in-node-js-96204453d72b). For example, if you need the app to send data to the server through the local network, identify the IP address of the server on the local network (say it's 192.168.0.190), then run:

```sh
npm install -g mkcert
mkcert create-ca
mkcert create-cert 192.168.0.190
```

## Contribute

Help is welcome!
See the current roadmap of the whole project on the [wiki](https://github.com/Mobistudy/MobistudyAPI/wiki/Roadmap).

If you want to add a new task, a preliminary guide is [here](https://github.com/Mobistudy/MobistudyAPI/wiki/NewTask).


## Credits

Original idea: [Dario Salvi](https://github.com/dariosalvi78) and [Carmelo Velardo](https://github.com/2dvisio).

Coordination: [Dario Salvi](https://github.com/dariosalvi78) and [Carl Magnus Olsson](https://github.com/Trasselkalle).

Development:
- [Dario Salvi](https://github.com/dariosalvi78)
- [Arvind Goburdhun](https://github.com/arvgo)
- [Elin Forsnor](https://github.com/elinforsnor)
- [Felix Morau](https://github.com/femosc2)
- [Milo Bengtsson](https://github.com/palladog)
- [Daniel Abella](https://github.com/assimilate)
- [Kevin Tsang](https://github.com/kevinchtsang)
- [Gent Ymeri](https://github.com/gentymeri)


## License

See [license file](LICENSE)
