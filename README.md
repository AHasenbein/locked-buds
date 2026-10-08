# 🔒 Locked Buds

A gamified dashboard for the Canvas LMS. Connect your Canvas account and Locked Buds pulls your courses, grades, and assignments, then turns them into a score that rewards staying on top of your work.

## Features

- **Canvas API integration:** fetches your profile, active courses with current scores, and every course's assignments with submission status. Course requests run in parallel.
- **Score system:** points combine your average grade with the number of assignments you've submitted.
- **Stats:** completion rate and number of upcoming assignments at a glance.
- **Upcoming list:** your next 10 assignments across all courses, sorted by due date.
- **Demo mode:** try the full UI with sample data, no Canvas account needed.

## Running locally

Canvas doesn't allow browser requests from other origins, so the app talks to Canvas through a small local proxy.

```bash
npm install

# terminal 1: proxy to your school's Canvas instance
npx local-cors-proxy --proxyUrl https://<your-school>.instructure.com

# terminal 2
npm start
```

Then generate an access token in **Canvas → Account → Settings → New Access Token** and paste it into the login screen. The token stays in your browser's localStorage and is only sent to Canvas.

## Tech

React · Canvas LMS REST API · local-cors-proxy
