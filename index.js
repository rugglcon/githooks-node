const express = require('express');
const exec = require('child_process').exec;
const npmRun = require('npm-run');
const mailer = require('nodemailer');

const app = express();

let account = null;
let transport = null;

const getAccount = async () => {
    if (account == null) {
        account = await mailer.createTestAccount();
    }
    return account;
};

const getTransport = async () => {
    const account = await getAccount();
    if (transport == null) {
        transport = mailer.createTransport({
            host: 'smtp.gmail.com',
            auth: {
                user: 'gitwebhooks@gmail.com',
                pass: process.env.PASSWORD
            }
        });
    }
    return transport;
};

app.post('/connorruggles.dev', (req, res) => {
    console.log(`received webhook for connorruggles.dev from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec(`cd /var/www/connorruggles.dev/html && git pull`, (err, stdout) => {
        if (err) {
            res.status(500).send(err);
            console.log('something went wrong deploying connorruggles.dev');
            return getTransport().then(() => {
                transport.sendMail({
                    from: 'Githooks auto deploy application',
                    to: 'conruggles@gmail.com',
                    subject: 'Error deploying connorruggles.dev',
                    html: '<p>There was an error trying to deploy connorruggles.dev: ' + err.message + '<br>' + err.stack + '</p>'
                }).then(info => {
                    console.log('sent email telling of error; messageId: ' + info.messageId);
                });
            }).catch(console.log);
        }
        console.log('successfully deployed connorruggles.dev');
        getTransport().then(() => {
            transport.sendMail({
                from: 'Githooks auto deploy application',
                to: 'conruggles@gmail.com',
                subject: 'Successfully deployed connorruggles.dev',
                html: '<p>No content.</p>'
            }).then(info => console.log('sent success email with id ' + info.messageId));
        }).catch(console.log);
    });
    res.end();
});

app.post('/budget-tracker-ui', (req, res) => {
    console.log(`received webhook for budget-tracker-ui from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /home/connor/dev/budget-tracker-ui && git pull && ' +
         'npm install && ./node_modules/.bin/ng build --prod --progress=false && ' +
         '/bin/cp dist/budget-tracker/* /var/www/budget-tracker-ui', {cwd: '/home/connor/dev/budget-tracker-ui'}, (err, stdout) => {
             if (err) {
                 console.log('something went wrong deploying budget-tracker-ui', err);
                 res.status(500).send(err);
                 return getTransport().then(() => {
                    transport.sendMail({
                        from: 'Githooks auto deploy application',
                        to: 'conruggles@gmail.com',
                        subject: 'Error deploying budget-tracker-ui',
                        html: '<p>There was an error trying to deploy budget-tracker-ui: ' + err.message + '<br>' + err.stack + '</p>'
                    }).then(info => {
                        console.log('sent email telling of error; messageId: ' + info.messageId);
                    });
                }).catch(console.log);
             }
             console.log('successfully deployed budget-tracker-ui');
             getTransport().then(() => {
                transport.sendMail({
                    from: 'Githooks auto deploy application',
                    to: 'conruggles@gmail.com',
                    subject: 'Successfully deployed budget-tracker-ui',
                    html: '<p>No content.</p>'
                }).then(info => console.log('sent success email with id ' + info.messageId));
            }).catch(console.log);
    });
    res.end();
});

app.post('/githooks', (req, res) => {
    console.log(`received webhook for githooks-node from host: ${req.headers.host}, origin: ${req.get('origin')}`);
    exec('cd /var/www/githooks-node && git pull && npm install && /bin/systemctl restart githooks.service', (err, stdout) => {
        if (err) {
            console.log('something went wrong deploying githooks');
            res.status(500).send(err);
            return getTransport().then(() => {
                transport.sendMail({
                    from: 'Githooks auto deploy application',
                    to: 'conruggles@gmail.com',
                    subject: 'Error deploying githooks',
                    html: '<p>There was an error trying to deploy githooks: ' + err.message + '<br>' + err.stack + '</p>'
                }).then(info => {
                    console.log('sent email telling of error; messageId: ' + info.messageId);
                });
            }).catch(console.log);
        }
        console.log('successfully deployed githooks');
        getTransport().then(() => {
            transport.sendMail({
                from: 'Githooks auto deploy application',
                to: 'conruggles@gmail.com',
                subject: 'Successfully deployed githooks',
                html: '<p>No content.</p>'
            }).then(info => console.log('sent success email with id ' + info.messageId));
        }).catch(console.log);
    });
    res.end();
});

app.listen(3300);