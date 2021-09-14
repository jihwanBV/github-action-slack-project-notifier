const core = require('@actions/core')
const github = require('@actions/github')

const https = require('https')

const testData = get_test_data()
const slackWebHookURL = testData.slack_url || core.getInput('SLACK_WEBHOOK_URL')

function get_test_data() {
  const fs = require('fs')
  const fileName = 'test_data2'
  const path = `./${fileName}.js`

  try {
    if (fs.existsSync(path)) {
      //file exists
      return require(`./${fileName}`).data
    }else{
      return {
      }  
    }
  } catch (err) {
    // console.error(err)
    return {
      'slack_url' : undefined,
      'token': undefined,
      'context_data': undefined
    }
  }
}

async function project_move_message(octokit, payload) {
  const changedColumnId = payload.changes && payload.changes.column_id
  console.log(`changed project : ${payload.project_card.project_url}`)

  if (changedColumnId) {
    if (payload.project_card.creator.url) {

      const fromStatus = await octokit.request('GET /projects/columns/{column_id}', {
        column_id: payload.changes.column_id.from,
        mediaType: {
          previews: [
            'inertia'
          ]
        }
      })

      const newStatus = await octokit.request('GET /projects/columns/{column_id}', {
        column_id: payload.project_card.column_id,
        mediaType: {
          previews: [
            'inertia'
          ]
        }
      })

      const projectInfo = await octokit.request(payload.project_card.project_url, {
        mediaType: {
          previews: [
            'inertia'
          ]
        }
      })

      const cardInfoResponse = await octokit.request('GET /projects/columns/cards/{card_id}', {
        card_id: payload.project_card.id,
        mediaType: {
          previews: [
            'inertia'
          ]
        }
      })

      let cardInfo = undefined

      if (!cardInfoResponse.data.content_url) {
        cardInfo = cardInfoResponse.data
        cardInfo['type'] = 'note'
      } else {
        cardInfoResponse.data.content_url
        // 'https://api.github.com/repos/jihwanBV/slack-event-notify-test/issues/3'
        const issueInfoResponse = await octokit.request(cardInfoResponse.data.content_url, {
          card_id: payload.project_card.id,
          mediaType: {
            previews: [
              'inertia'
            ]
          }
        })
        cardInfo = issueInfoResponse.data
        cardInfo['type'] = 'issue'
      }

      return {
        "username": "Projector",
        "text": "Heya! Project Card status updated.",
        "icon_emoji": ":rainbloblurk:",
        "attachments": [
          {
            "color": "#2eb886",
            "fields": [
              {
                "title": `${projectInfo.data.name} - [${cardInfo.type}]`,
                "value": cardInfo.type == 'note' ? cardInfo.note : cardInfo.title,
                "short": true
              },
              {
                "title": ``,
                "value": "",
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
                "text": "View Project",
                "url": `${projectInfo.data.html_url}`
              }
            ]
          }
        ]
      }
    }
  }
}


/**
 * Handles the actual sending request.
 * Turns https.request into a Promise.
 * @param webhookURL
 * @param messageBody
 * @return {Promise}
 */
function sendSlackMessage(webhookURL, messageBody) {
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

async function run() {
  try {
    if (testData.context_data)
      github.context.payload = testData.context_data

    const token = testData.token || core.getInput('TOKEN')
    const octokit = github.getOctokit(token);
    let message = undefined;
    if (github.context.payload.action == 'moved') {
      message = await project_move_message(octokit, github.context.payload)
    }

    if (message)
      (async function () {
        if (!slackWebHookURL) {
          console.error('Missing Slack Webhook URL')
        }

        console.log('Sending message')
        try {
          const slackResponse = await sendSlackMessage(slackWebHookURL, message)
          console.log('Message response', slackResponse)
        } catch (e) {
          console.error('Request error', e)
        }
      })()
  } catch (error) {
    console.error(error)
    core.setFailed(`Error: ${error}`)
  }
}

run()
