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

    let payload;
    try {
        payload = JSON.stringify(req.body);
    } catch (e) {
        const msg = `error calling JSON.stringify with argument ${req.body}. ${e.message}: ${e.stack}`;
        console.log(msg);
        sendEmail('Error happened while calling JSON.stringify', msg);
        return next(msg);
    }

    console.log(`got payload ${payload}`);

    if (!payload) {
        sendEmail('Invalid githook received', `Received an invalid githook request to ${req.originalUrl} from ${req.ip}; no payload body was included.\n\nbody: ${req.body.toString()}`);
        return next('Request body empty');
    }

    const hmac = crypto.createHmac('sha1', process.env.GITHOOK_SECRET);
    let digest;
    try {
        digest = `sha1=${hmac.update(payload).digest('hex')}`;
    } catch (e) {
        const msg = `Error creating the digest. payload: ${payload}, error: ${e.message}`;
        console.log(msg);
        sendEmail('Error creating digest', msg);
        return next(msg);
    }

    if (!digest || sig !== digest) {
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
    res.status(403).send('Request body was not signed or verification failed');
});

const sendEmail = (subject, content) => {
    return new Promise((resolve, reject) => {
        mg.messages().send({
            from: process.env.EMAIL,
            to: 'connor@connorruggles.dev',
            subject,
            text: content
        }, (err, body) => {
            if (err) reject(err);
            resolve(body);
        });
    });
};

const onError = (appName, err, stdout) => {
    console.log('something went wrong deploying ' + appName);
    console.log(err);
    return sendEmail('Error deploying ' + appName,
                    `There was an error trying to deploy ${appName}: ${err.message}\n${err.stack}.\nstdout: ${stdout}`)
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
    exec('git pull', { cwd: '/var/www/connorruggles.dev/html' }, (err, stdout) => {
        if (err) {
            return onError('connorruggles.dev', err);
        }
        onSuccess('connorruggles.dev');
    });
    res.end();
});

app.post('/budget-tracker-ui', (req, res) => {
    console.log(`received webhook for budget-tracker-ui from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('git pull && ./deploy.sh', { cwd: '/home/connor/dev/budget-tracker-ui' }, (err, stdout) => {
            if (err) {
                return onError('budget-tracker-ui', err);
            }
            onSuccess('budget-tracker-ui');
    });
    res.end();
});

app.post('/budgettracker', (req, res) => {
    console.log(`received webhook for budget tracker backend from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('git pull && ./deploy.sh', { cwd: '/var/www/budgettracker' }, (err, stdout) => {
        if (err) {
            return onError('budgettracker', err, stdout);
        }
        onSuccess('budgettracker');
    });
    res.end();
});

app.post('/githooks', (req, res) => {
    console.log(`received webhook for githooks-node from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('git pull && npm install && /bin/systemctl restart githooks.service', { cwd: '/var/www/githooks-node' }, (err, stdout) => {
        if (err) {
            return onError('githooks', err);
        }
        onSuccess('githooks');
    });
    res.end();
});

app.listen(3300);
