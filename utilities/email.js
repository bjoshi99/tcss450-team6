const nodemailer = require('nodemailer');

const EMAIL = process.env.EMAIL_USERNAME;
const PASSWORD = process.env.EMAIL_PASSWORD;

let sendEmail = (sender, receiver, subject, message) => {
    //research nodemailer for sending email from node.
    // https://nodemailer.com/about/
    // https://www.w3schools.com/nodejs/nodejs_email.asp
    //create a burner gmail account 
    //make sure you add the password to the environmental variables
    //similar to the DATABASE_URL and PHISH_DOT_NET_KEY (later section of the lab)
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL,
                pass: PASSWORD
            }
        });

        let mailOptions = {
            from: sender,
            to: receiver,
            subject: subject,
            html: message
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
    catch (e) {
        console.log("Error: ", e);
    }
}

module.exports = {
    sendEmail
}