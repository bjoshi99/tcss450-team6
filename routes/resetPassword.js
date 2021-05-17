//express is the framework we're going to use to handle requests
const express = require('express')

//retrieve the router object from express
var router = express.Router()

//Access the connection to Heroku Database
const pool = require('../utilities').pool

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided

const generateHash = require('../utilities').generateHash
const generateSalt = require('../utilities').generateSalt

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


/**
 * @api {put} /auth put Request to register a user
 * @apiName PutAuth
 * @apiGroup Auth
 * 
 * @apiParam {String} email a users email *unique
 * @apiParam {String} password a users password
 * @apiParam {String} verification code sent to user email
 * 
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "email":"cfb3@fake.email",
 *      "password":"test12345",
 *      "verificationcode":"abcd123"
 *  }
 * 
 * @apiSuccess (Success 201) {boolean} success true when the password is updated
 * @apiSuccess (Success 201) {String} email the email of the user 
 * 
 * @apiError (400: Email does not exists) {String} message "Email does not exists"
 *  
 * @apiError (400: Other Error) {String} message "other error, see detail"
 * @apiError (400: Other Error) {String} detail Information about th error
 * 
 */ 
 router.put('/', (request, response, next) => {

    //Retrieve data from query params
    const email = request.body.email
    const password = request.body.password
    const verificationCode = request.body.verificationcode
    //Verify that the caller supplied all the parameters
    //In js, empty strings or null values evaluate to false
    if(isStringProvided(email) 
        && isStringProvided(password)
        && isStringProvided(verificationCode)) {

        const query = "SELECT Username FROM Members WHERE Email=$1"
        const values = [request.body.email]

        pool.query(query, values)
        .then(result => { 
            
            if(result.rowCount == 0){
                response.status(400).send({
                    message: "User not found."
                })
                return
            }
            next()
        })
        .catch((error) => {
            console.error("Code does not match query error", error)
            response.status(400).send({
                message: err.detail
            })
        })

    }else{
        response.status(400).send({
                message: "Missing required information"
            })
    }
 }, (request, response, next) =>{

    //this might be needed to avoid unauthorized access to update user password

    const theQuery = "SELECT uniquestring FROM ResetPassword WHERE Email=$1"
    const values = [request.body.email]
    pool.query(theQuery, values)
        .then(result => { 
            
            // console.log("verifcations : "+result.rows[0].uniquestring + "and user passed :"+request.body.verificationcode)

            if(result.rowCount == 0 || (request.body.verificationcode != result.rows[0].uniquestring)){
                response.status(400).send({
                    message: "Verification code is invalid: Unauthorized access."
                })
                return
            }
            next()
        })
        .catch((error) => {
            console.error("Code does not match query error", error)
            response.status(400).send({
                message: err.detail
            })
        })

 }, (request, response) =>{

        let password = request.body.password
        let email = request.body.email

        //We're storing salted hashes to make our application more secure
        //If you're interested as to what that is, and why we should use it
        //watch this youtube video: https://www.youtube.com/watch?v=8ZtInClXe1Q
        let salt = generateSalt(32)
        let salted_hash = generateHash(password, salt)
        
        //We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
        //If you want to read more: https://stackoverflow.com/a/8265319
        let theQuery = "UPDATE MEMBERS SET Password = $1, Salt = $2 WHERE Email=$3"
        let values = [salted_hash, salt, email]
        pool.query(theQuery, values)
            .then(result => {

                console.log("Result of final query: "+result)
                //We successfully updates the user!
                response.status(201).send({
                    success: true,
                    email: email
                })
            
            })
            .catch((error) => {
                //log the error
                    console.log(error)
                    response.status(400).send({
                        message: "other error, see detail",
                        detail: error.detail
                    })
                
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