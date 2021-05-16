//express is the framework we're going to use to handle requests
const express = require('express')

//retrieve the router object from express
var router = express.Router()

//Access the connection to Heroku Database
const pool = require('../utilities').pool

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided

const sendEmail = require('../utilities').sendEmail

/**
 * @api {post} /resend Request to send email varification for password verification
 * @apiName PostResend
 * @apiGroup Resend
 * 
 * @apiParam {String} email user's email
 *
 * @apiSuccess {String} message Verification email resent successfully.
 */
router.post("/", (request, response, next) => {
    // const hash = generateHash(email)
    // console.log("email " + request.body.email)
    if (isStringProvided(request.body.email)) {
        // console.log("Email is okay : " + request.body.email)
        next()
    } else {
        response.status(400).send({
            message: "Missing required information",
            Verificationcode: 0000
        })
    }    
}, (request, response, next) => {
    const theQuery = "SELECT Verification FROM Members WHERE Email=$1"
    const values = [request.body.email]
    pool.query(theQuery, values)
        .then(result => { 
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: 'User not found',
                    Verificationcode: 0000 
                })
                return
            }
            next()
        })
        .catch((err) => {
            console.log(err.stack)
            response.status(400).send({
                message: err.detail
            })
        })
}, (request, response) => {

        //if there is already request with code then update it

        let theQuery = "SELECT uniquestring FROM ResetPassword WHERE Email=$1"
        let values = [request.body.email]

        pool.query(theQuery, values)
        .then(result => {

            if(result.rowCount == 0){

                var email = request.body.email;
                var code = makeid(8);
                let theQuery = "INSERT INTO ResetPassword(uniquestring, email, verified) VALUES ($1, $2,$3)"
                let values = [code, email, 0]
                
                pool.query(theQuery, values)
                    .then(result => {
                        
                            console.log("uniqueString " + code)
                            
                            const message = "You are receiving thie email in response to a request to "
                                            + "reset the password for your account. \
                                            \
                                            Here is your 8 digit code. Please do not share this with anyone.\
                                            \
                                            "+code+""
                        
                            sendEmail(process.env.EMAIL_USERNAME, email, "Reset Password Request!", message)
                    })
                    .catch((error) => {
                        console.error("Verify query error", error)
                    })
                    response.send({
                        message: "Email sent Successfully.",
                        Verificationcode: code
                    })
            }
            else{

                var email = request.body.email;
                var code = makeid(8);

                let query = "UPDATE ResetPassword SET uniquestring = $1 WHERE Email=$2"
                let values = [code, email]

                pool.query(query, values)
                    .then(result => {

                        console.log("Update query plan : uniqueString " + code)
                            
                            const message = "You are receiving thie email in response to a request to "
                                            + "reset the password for your account. \
                                            \
                                            Here is your 8 digit code. Please do not share this with anyone.\
                                            \
                                            "+code+""
                        
                            sendEmail(process.env.EMAIL_USERNAME, email, "Reset Password Request!", message)
                })
                .catch((error) => {
                    console.error("Verify query error", error)
                })
                response.send({
                    message: "Email sent Successfully.",
                    Verificationcode: code
                })

            }
        })
})


function makeid(length) {

    var result = [];
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;

    for ( var i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * 
                                            charactersLength)));
   }

   return result.join('');
}

module.exports = router