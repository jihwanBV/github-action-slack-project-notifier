const core = require('@actions/core')
const github = require('@actions/github')

const https = require('https')

const testData = require('./test_data').data
const slackWebHookURL =  testData.slack_url || core.getInput('SLACK_WEBHOOK_URL')

async function run() {
  try {
    if(testData)
      github.context.payload = testData.context_data

    const token =  testData.token || core.getInput('TOKEN')
    const octokit = github.getOctokit(token);
    const changedColumnId = github.context.payload.changes && github.context.payload.changes.column_id

    console.log(`changed project : ${github.context.payload.project_card.project_url}`)

    if (changedColumnId) {
      if (github.context.payload.project_card.creator.url) {

          const fromStatus = await octokit.request('GET /projects/columns/{column_id}', {
            column_id: github.context.payload.changes.column_id.from,
            mediaType: {
              previews: [
                'inertia'
              ]
            }
          })

          const newStatus = await octokit.request('GET /projects/columns/{column_id}', {
            column_id: github.context.payload.project_card.column_id,
            mediaType: {
              previews: [
                'inertia'
              ]
            }
          })

          const projectInfo = await octokit.request(github.context.payload.project_card.project_url, {
            mediaType: {
              previews: [
                'inertia'
              ]
            }
          })

          const cardInfoResponse = await octokit.request('GET /projects/columns/cards/{card_id}', {
            card_id: github.context.payload.project_card.id,
            mediaType: {
              previews: [
                'inertia'
              ]
            }
          })

          let cardInfo = undefined

          if(!cardInfoResponse.data.content_url){
            cardInfo = cardInfoResponse.data
            cardInfo['type'] = 'note'
          }else{
            cardInfoResponse.data.content_url
            // 'https://api.github.com/repos/jihwanBV/slack-event-notify-test/issues/3'
            const issueInfoResponse = await octokit.request(cardInfoResponse.data.content_url, {
              card_id: github.context.payload.project_card.id,
              mediaType: {
                previews: [
                  'inertia'
                ]
              }
            })
            cardInfo = issueInfoResponse.data
            cardInfo['type'] = 'issue'
          }

          const userAccountNotification =  {
            "username": "Projector",
            "text": "Heya! Project Card status updated.",
            "icon_emoji": ":rainbloblurk:",
            "attachments": [
              {
                "color": "#2eb886",
                "fields": [
                  {
                    "title": "Project Name",
                    "value": projectInfo.data.name,
                    "short": true
                  },
                  {
                    "title": `Card Name [${cardInfo.type}]`,
                    "value": cardInfo.type == 'note' ? cardInfo.note : cardInfo.title,
                    "short": true
                  },
                  {
                    "title": "From Status",
                    "value": fromStatus.data.name,
                    "short": true
                  },
                  {
                    "title": "To Status",
                    "value": newStatus.data.name,
                    "short": true
                  }
                ],
                "actions": [
                  {
                    "type": "button",
                    "text": "View Project Issue",
                    "url": `${projectInfo.data.html_url}`
                  }
                ]
              }
            ]
          }

          /**
           * Handles the actual sending request.
           * Turns https.request into a Promise.
           * @param webhookURL
           * @param messageBody
           * @return {Promise}
           */
          function sendSlackMessage (webhookURL, messageBody) {
            try {
              messageBody = JSON.stringify(messageBody)
            } catch (e) {
              throw new Error('Failed to stringify messageBody', e)
            }

            return new Promise((resolve, reject) => {
              const requestOptions = {
                method: 'POST',
                header: {
                  'Content-Type': 'application/json'
                }
              }

              const req = https.request(webhookURL, requestOptions, (res) => {
                let response = ''

                res.on('data', (d) => {
                  response += d
                })

                res.on('end', () => {
                  resolve(response)
                })
              })

              req.on('error', (e) => {
                reject(e)
              })

              req.write(messageBody)
              req.end()
            })
          }


          (async function () {
            if (!slackWebHookURL) {
              console.error('Missing Slack Webhook URL')
            }

            console.log('Sending message')
            try {
              const slackResponse = await sendSlackMessage(slackWebHookURL, userAccountNotification)
              console.log('Message response', slackResponse)
            } catch (e) {
              console.error('Request error', e)
            }
          })()

    }
  }
  } catch (error) {
    console.error(error)
    core.setFailed(`Error: ${error}`)
  }
}

run()
