const express = require('express');
const exec = require('child_process').exec;

const app = express();

app.post('/connorruggles.dev', (req, res) => {
    exec(`cd /var/www/connorruggles.dev/html && git pull`);
    res.end();
});

app.post('/budget-tracker-ui', (req, res) => {
    exec('cd /home/connor/dev/budget-tracker-ui && npm run build:prod && cp dist/* /var/www/budget-tracker-ui')
});

app.listen(3300);