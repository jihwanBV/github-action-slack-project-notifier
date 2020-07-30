# Slack Project Notifier

> A GitHub Action :rainbow:

Magical slack updates for transparent GitHub project movement.

---

1. Move project card.
2. Receive Slack notification of the new column.
3. Click button to view issue.

### Single Project Mode

You can set the Action to work only on one project.

You can then setup multiple actions on multiple projects, if you want.

1. Setup the action and move a card once in the project you want to "lock".
2. View the console output for the "Magical Slack Notifier" step.
3. Look for the line that says: `Your PROJECT variable for the current project is:`
4. Add that as PROJECT.

### Example workflow

```yaml
name: Slack Project Notifier

on:
  project_card:
      types: [moved]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Magical Slack Notifier
        uses: goodroot/github-action-slack-project-notifier@1.1
        with:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          PROJECT: ''
          TOKEN: ${{ secrets.TOKEN }}
```
