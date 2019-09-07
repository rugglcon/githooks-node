const express = require('express');
const exec = require('child_process').execSync;
const npmRun = require('npm-run');

const app = express();

app.post('/connorruggles.dev', (req, res) => {
    console.log(`received webhook for connorruggles.dev from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec(`cd /var/www/connorruggles.dev/html && git pull`);
    console.log('successfully deployed connorruggles.dev');
});

app.post('/budget-tracker-ui', (req, res) => {
    console.log(`received webhook for budget-tracker-ui from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /home/connor/dev/budget-tracker-ui && git pull && npm install');
    exec('./node_modules/.bin/ng build --prod --progress=false', {cwd: '/home/connor/dev/budget-tracker-ui'});
    exec('cp dist/* /var/www/budget-tracker-ui');
    console.log('successfully deployed budget-tracker-ui');
    res.end();
});

app.post('/githooks', (req, res) => {
    console.log(`received webhook for githooks-node from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /var/www/githooks-node && git pull && npm install');
    console.log('successfully deployed githooks');
    res.end();
    exec('/bin/systemctl restart githooks.service');
});

app.listen(3300);