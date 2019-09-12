const express = require('express');
const exec = require('child_process').exec;
const crypto = require('crypto');
const bodyParser = require('body-parser');

const mg = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: 'mg.connorruggles.dev' });

const app = express();
app.enable('trust proxy');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use((req, res, next) => {
    const sig = req.get('X-Hub-Signature');
    if (!sig) {
        console.log('received invalid githook event');
        sendEmail('Invalid githook received', `Received an invalid githook request to ${req.originalUrl} from ${req.ip}; no signature was included in the header.\n\nbody: ${req.body.toString()}`);
        return next('No signature header included in the request.');
    }

    const payload = JSON.stringify(req.body);
    if (!payload) {
        sendEmail('Invalid githook received', `Received an invalid githook request to ${req.originalUrl} from ${req.ip}; no payload body was included.\n\nbody: ${req.body.toString()}`);
        return next('Request body empty');
    }

    const hmac = crypto.createHmac('sha1', process.env.GITHOOK_SECRET);
    const digest = `sha1=${hmac.update(payload).digest('hex')}`;

    if (!digest) {
        console.log('signatures didn\'t match');
        sendEmail('Invalid githook received', `Received an invalid githook request to ${req.originalUrl} from ${req.ip}; signatures didn't match.\n digest: ${digest}, sig: ${sig}`);
        return next('signatures didn\'t match');
    }

    if (req.body.ref) {
        if (req.body.ref.split('/')[1] === 'heads' && req.body.ref.split('/')[2] === 'master') {
            console.log('valid githook event');
            return next();
        }
    }
    res.end();
});

app.use((err, req, res, next) => {
    if (err) {
        console.log(err);
    }
    sendEmail('Something went wrong', 'Request body was not signed or verification failed');
    res.status(403).send('Request body was not signed or verification failed');
});

const sendEmail = (subject, content) => {
    return new Promise((resolve, reject) => {
        mg.messages().send({
            from: process.env.EMAIL,
            to: 'conruggles@gmail.com',
            subject,
            text: content
        }, (err, body) => {
            if (err) reject(err);
            resolve(body);
        });
    });
};

const onError = (appName, err) => {
    console.log('something went wrong deploying ' + appName);
    console.log(err);
    return sendEmail('Error deploying ' + appName,
                    `There was an error trying to deploy ${appName}: ${err.message}\n${err.stack}`)
            .then(() => console.log('sent email telling of error'))
            .catch(console.log);
};

const onSuccess = appName => {
    console.log(`successfully deployed ${appName}`);
    sendEmail(`Successfully deployed ${appName}`, 'No content.')
        .then(() => console.log('sent success email')).catch(console.log);
};

app.post('/connorruggles.dev', (req, res) => {
    console.log(`received webhook for connorruggles.dev from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec(`cd /var/www/connorruggles.dev/html && git pull`, (err, stdout) => {
        if (err) {
            return onError('connorruggles.dev', err);
        }
        onSuccess('connorruggles.dev');
    });
    res.end();
});

app.post('/budget-tracker-ui', (req, res) => {
    console.log(`received webhook for budget-tracker-ui from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /home/connor/dev/budget-tracker-ui && git pull && ' +
        'npm install && ./node_modules/.bin/ng build --prod --progress=false && ' +
        '/bin/cp dist/budget-tracker/* /var/www/budget-tracker-ui', { cwd: '/home/connor/dev/budget-tracker-ui' }, (err, stdout) => {
            if (err) {
                return onError('budget-tracker-ui', err);
            }
            onSuccess('budget-tracker-ui');
    });
    res.end();
});

app.post('/budgettracker', (req, res) => {
    console.log(`received webhook for budget tracker backend from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /var/www/budgettracker && git pull && npm install && ./node_modules/.bin/tsc && /bin/systemctl restart budget_api.service', { cwd: '/var/www/budgettracker' }, (err, stdout) => {
        if (err) {
            return onError('budgettracker', err);
        }
        onSuccess('budgettracker');
    });
    res.end();
});

app.post('/githooks', (req, res) => {
    console.log(`received webhook for githooks-node from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /var/www/githooks-node && git pull && npm install && /bin/systemctl restart githooks.service', (err, stdout) => {
        if (err) {
            return onError('githooks', err);
        }
        onSuccess('githooks');
    });
    res.end();
});

app.listen(3300);