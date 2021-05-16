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
 * @api {post} /resend Request to re-send email varification
 * @apiName PostResend
 * @apiGroup Resend
 * 
 * @apiParam {String} email user's email
 *
 * @apiSuccess {String} message Verification email resent successfully.
 */
router.post("/", (request, response) => {
    // const hash = generateHash(email)
    // console.log("email " + request.body.email)
    if (isStringProvided(request.body.email)) {

        let Useremail = request.body.email;
        let verifyQuery = "SELECT UniqueString, email FROM VERIFICATION WHERE email=$1"
        let value = [Useremail]
        // let verifyValues = [hash, email]

        pool.query(verifyQuery, value)
            .then(result => {
                    const hash = result.rows[0].uniquestring;
                    const email = result.rows[0].email;
                    // console.log("uniqueString " + hash)
                    const link = "https://" + request.get('host') + "/auth/verify/" + hash
                    const message = "Please verify your email account. <a href="
                        + link + ">Click here to verify</a>"
                
                    sendEmail(process.env.EMAIL_USERNAME, email, "Welcome to our App!", message)
            })
            .catch((error) => {
                console.error("Verify query error", error)
        })
        response.send({
            message: "Email resent Successfully."
        })
    } else {
        response.status(400).send({
            message: "Missing required information"
        })
    }

    
})

// /**
//  * @api {post} /params Request an message echo with a parameter 
//  * @apiName PostResend
//  * @apiGroup Resend
//  * 
//  * @apiParam {String} email user's valid email
//  * 
//  * @apiSuccess {String} message Hello World message with echo of name
//  * 
//  * @apiError (400: Missing Parameters) {String} message "Missing required information"
//  */ 
//  router.post("/", (request, response) => {
//     if (isStringProvided(request.body.name)) {
//         response.send({
//             //req.body is a reference to arguments in the POST body
//             message: "Hello, " + request.body.name + "! You sent a POST Request"
//         })
//     } else {
//         response.status(400).send({
//             message: "Missing required information"
//         })
//     }
// })

router.get('/verify/:uniqueString', (request, response) => {
    let uniqueString = request.params.uniqueString
    let theQuery = "SELECT * FROM Verification WHERE UniqueString=$1"
    let values = [uniqueString]
    pool.query(theQuery, values)
        .then(result => {
            // response.status(201).send({
            //     success: true,
            //     email: result.rows[0].email
            // })
            let updateQuery = "UPDATE Members SET Verification=$1 WHERE Email=$2"
            let values = [1, result.rows[0].email]
            pool.query(updateQuery, values)
                .then(result => {
                    // response.status(201).send("Email successfully verified.")
                    response.status(201).sendFile('../utilities/emailverify.html')
                })
                .catch((error) => {
                    console.log(error)
                })
        })
        .catch((error) => {
            console.log(error)
        })
})

// /**
//  * @api {post} /hello Request a Hello World message
//  * @apiName PostHello
//  * @apiGroup Hello
//  * 
//  * @apiSuccess {String} message Hello World message
//  */ 
// router.post("/", (request, response) => {
//     response.send({
//         message: "Hello, you sent a POST request"
//     })
// })
// "return" the router
module.exports = router