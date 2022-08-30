require('isomorphic-fetch');

const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

// send email example: https://docs.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0&tabs=javascript
// auth provider: https://docs.microsoft.com/en-us/graph/sdks/choose-authentication-providers?tabs=Javascript#client-credentials-provider=

/*
Directory (tenant) ID:601bc2d3-e6eb-42a7-9990-b8072b680528

Application (client) ID: 12a646c0-fd6c-4244-9283-338610cc56c4

Secret: atv8Q~bR~O3HOwy.D5kiO~LArHiNjrKrm8Pf1dxl
*/

// Create an instance of the TokenCredential class that is imported
/*
     * @param tenantId - The Azure Active Directory tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param clientSecret
*/
const credential = new ClientSecretCredential('601bc2d3-e6eb-42a7-9990-b8072b680528', '12a646c0-fd6c-4244-9283-338610cc56c4', 'atv8Q~bR~O3HOwy.D5kiO~LArHiNjrKrm8Pf1dxl')

// Set your scopes and options for TokenCredential.getToken (Check the ` interface GetTokenOptions` in (TokenCredential Implementation)[https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts])

const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['Mail.Send'] })

// const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['https://graph.microsoft.com/.default'] })

const client = Client.initWithMiddleware({
  debugLogging: true,
  authProvider,
})


const sendMail = {
  message: {
    subject: 'Meet for lunch?',
    body: {
      contentType: 'Text',
      content: 'The new cafeteria is open.'
    },
    toRecipients: [
      {
        emailAddress: {
          address: 'dario.salvi@mau.se'
        }
      }
    ]
  },
  saveToSentItems: 'false'
}

client.api('/me/sendMail')
  .post(sendMail)
  .then(d => {
    console.log('OK', d)
  })
  .catch(err => console.error('ERR', err))
