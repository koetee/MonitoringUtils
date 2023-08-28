# MonitoringUtils

This project is a utility that monitors the status of multiple bots running through the pm2 process manager and provides server metrics. The bot periodically gathers data about memory usage, CPU utilization, restart counts, and server performance. It then formats this information into rich embeds and sends them to a specified Discord channel via a webhook.



## # Installation and Usage:

Clone the repository:

```bash
  git clone https://github.com/koetee/MonitoringUtils.git
```
Install the required dependencies:
```bash
 npm install
```
Create a .env file in the project directory and add your Discord webhook URL:
```bash
  webhook_uri="https://discord.com/api/webhooks/your-webhook-id/your-webhook-token"
```
Run:
```bash
  node monitoring.js
```
