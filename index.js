const express = require('express');
const exec = require('child_process').exec;

const app = express();

app.post('/connorruggles.dev', (req, res) => {
    console.log(`received webhook for connorruggles.dev from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec(`cd /var/www/connorruggles.dev/html && git pull`, (err, stdout) => {
        if (err) {
            console.log('an error occurred with connorruggles.dev deploy');
            console.log(err);
            res.status(500).send(err);
        }
        console.log(stdout);
        console.log('successfully deployed connorruggles.dev');
        res.end();
    });
});

app.post('/budget-tracker-ui', (req, res) => {
    console.log(`received webhook for budget-tracker-ui from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /home/connor/dev/budget-tracker-ui && npm run build:prod && cp dist/* /var/www/budget-tracker-ui', (err, stdout) => {
        if (err) {
            console.log('an error occurred with budget-tracker-ui deploy');
            console.log(err);
            res.status(500).send(err);
        }
        console.log(stdout);
        console.log('successfully deployed budget-tracker-ui');
        res.end();
    });
});

app.listen(3300);