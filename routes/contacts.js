//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
let pool = require('../utilities').pool

var router = express.Router()

const contact_functions = require('../utilities/exports').messaging

//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(require("body-parser").json())


/**
 * @api {get} /contacts Request to get list of contacts 
 * @apiName GetContacts
 * @apiGroup Contacts
 * 
 * @apiDescription Request to get list of contacts
 * 
 * @apiSuccess {Object[]} contacts List of contacts
 * 
 * @apiError (404: memberId Not Found) {String} message "member ID Not Found"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */
 router.get("/", (request, response, next) => {

    if (!request.decoded.memberid) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.decoded.memberid)) {
        response.status(400).send({
            message: "Malformed parameter. memberId must be a number"
        })
    } else {
        next()
    }
}, (request, response) => {
    //Get contact info
    let query = 'SELECT Verified, MemberID_B, Members.FirstName, Members.LastName, Members.email, ' +
        'Members.Username FROM Contacts INNER JOIN Members ON Contacts.MemberID_B = Members.MemberID where Contacts.MemberID_A = $1 AND Contacts.Verified = 1'
    let values = [request.decoded.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Contact not found"
                })
            } else {
                let listContacts = [];
                result.rows.forEach(entry =>
                    listContacts.push(
                        {
                            "email": entry.email,
                            "firstName": entry.firstname,
                            "lastName": entry.lastname,
                            "userName": entry.username,
                            "memberId": entry.memberid_b,
                            "verified": entry.verified
                        }
                    )
                )
                response.send({
                    success: true,
                    contacts: listContacts
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
});

/**
 * @api {delete} /contacts/contact/:memberId? Request to delete contact 
 * @apiName DeleteContact
 * @apiGroup Contacts
 * 
 * @apiDescription Request to delete contact 
 * 
 * @apiParam {Number} memberId deleting 
 * 
 * @apiSuccess {boolean} success true when the name is deleted
 * @apiSuccess {String} success messsage when the name is deleted
 * 
 * @apiError (404: memberId Not Found) {String} message "Contact not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter" 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */
 router.delete("/contact/:memberId?", (request, response, next) => {
    if (!request.params.memberId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.memberId)) {
        response.status(400).send({
            message: "Malformed parameter."
        })
    } else {
        next()
    }
}, (request, response) => {
    // Delete contact
    let query = 'DELETE FROM Contacts WHERE MemberID_A=$1 and MemberID_B=$2'
    let values = [request.decoded.memberid, request.params.memberId]

    pool.query(query, values)
        .then(result => {
            response.send({
                success: true,
                "message":"contacts deleted successfully"
            })
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
});

/**
 * @api {post} /contacts Request to add a contact to current user.
 * @apiName PostContacts
 * @apiGroup Contacts
 * 
 * @apiDescription Adds contact to user contacts
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiBody {String} email of the contact being added
 * @apiBody {Number} verified 
 * 
 * @apiSuccess (Success 201) {boolean} success true when contact is added
 * @apiSuccess (Success 201) {String} success Message when contact is added
 * 
 * @apiError (400: Unknown user) {String} message "unknown contact"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiError (400: Unknow Member ID) {String} message "invalid member id"
 * 
 * @apiUse JSONError
 */
 router.post("/", (request, response, next) => {

    console.log("Iside the right end point")

    //validate on empty body
    if (!request.body.email && !request.body.verified) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.body.verified)) {
        response.status(400).send({
            message: "Malformed parameter. Required body contents should be integer."
        })
    } else {
        next()
    }
}, (request, response, next) => {
    let query = 'SELECT * FROM Members WHERE MemberID=$1'
    let values = [request.decoded.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "User not found."
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error (memberId check)",
                error: error
            })
        })
}, (request, response, next) => {
    let query = 'SELECT MemberID FROM Members WHERE email=$1'
    let values = [request.body.email]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Requested User not found."
                })
            } else {
                console.log("Getting from database: " + result.rows[0].memberid)
                var id = result.rows[0].memberid;
                request.memID = id;
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error (memberId check)",
                error: error
            })
        })
}, (request, response) => {
    if (request.body.verified == 1) {
        console.log("Inside the next with verified 1: " + request.memID)
        let insert = `UPDATE Contacts SET verified=1 where MemberID_A=$1 AND MemberID_B=$2`
        let values = [request.decoded.memberid, request.memID]
        pool.query(insert, values)
            .then(result => {
                response.send({
                    success: true
                })
            }).catch(err => {
                console.log(err);
                response.status(400).send({
                    message: "SQL Error on insert",
                    error: err
                })
            })
    } else {
        let insert = `INSERT INTO Contacts(MemberID_A, MemberID_B, verified) VALUES($1, $2, $3)`
        let values = [request.decoded.memberid, request.memID, request.body.verified]
        
        pool.query(insert, values)
            .then(result => {
                // if (result.rowCount == 1) {
                //     let insert = `INSERT INTO Contacts(MemberID_A, MemberID_B, verified) VALUES($1, $2, $3)`
                //     let values = [request.decoded.memberid, request.body.memberId, 1]

                //     console.log("here 2nd : "+request.decoded.toString('utf8'))

                //     pool.query(insert, values)
                //         .then(result => {
                //             if (result.rowCount == 1) {

                                let query = 'SELECT * FROM Push_Token WHERE MemberId = $1'
                                let value = [request.memID]

                                pool.query(query, value)
                                    .then(result => {

                                        let query = 'SELECT FirstName, LastName, Email FROM Members WHERE memberID = $1'
                                        let value = [95]
                                        // request.decoded.memberid
                                        console.log("result in the token query : ")
                                        console.log(result.rowCount)
                                        let tkn = result.rows[0].token
                    
                                        pool.query(query, value)
                                            .then(result => {

                                                let msg = "New contact request from " + result.rows[0].firstname + " " + result.rows[0].lastname
                                                            + ":" + result.rows[0].email
                                                            
                                                console.log(tkn + " and new mssg to send " + msg)
                                                 
                                                //send notification to pushy
                                                contact_functions.sendContactRequestToIndividual(
                                                    tkn, 
                                                    msg,
                                                    request.memID)

                                                response.send({
                                                    success: true,
                                                    "message":"contacts added successfully"
                                                })
                                            })
                                            .catch(error => {

                                            })
                                      
                                    })
            .catch(error => {
                                        console.log("Erro while selecting from push token: " + error)
                                        response.status(400).send({
                                            message: "SQL Error on select token",
                                            error: error
                                        })
                                    })

                            // } else {
                            //     response.status(400).send({
                            //         "message": "unknown error"
                            //     })
                            // }

                        // }).catch(err => {
                        //     console.log("Error inside the else ")
                        //     response.status(400).send({
                        //         message: "SQL Error on insert",
                        //         error: err
                        //     })
                        // })
                // } else {
                //     response.status(400).send({
                //         "message": "unknown error"
                //     })
                // }

            }).catch(err => {
                console.log("This is the only posisble else block")
                response.status(400).send({
                    message: "SQL Error on insert",
                    error: err
                })
            })
    }
})


/**
 * @api {get} /contacts/listofchat Request to get list of recent chats from contacts 
 * @apiName GetChatList
 * @apiGroup Contacts
 * 
 * @apiDescription Request to get list of chats with chat id and name
 * 
 * @apiSuccess {Object[]} chats List of chats with recent message { "chat": 1, "name": "Chat Name" }
 * 
 * @apiError (404: memberId Not Found) {String} message "member ID Not Found"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */
router.get("/listofchat", (request, response, next) => {

    if (!request.decoded.memberid) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.decoded.memberid)) {
        response.status(400).send({
            message: "Malformed parameter. memberId must be a number"
        })
    } else {
        next()
    }
}, (request, response) => {
    //Get all chats
    let query = 'SELECT ChatID, Name FROM Chats where ChatID in (SELECT ChatID FROM ChatMembers where MemberID=$1)'
    let values = [request.decoded.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "No messages"
                })
            } else {
                let listContactChats = [];
                result.rows.forEach(entry =>
                    listContactChats.push(
                        {
                            "chat": entry.chatid,
                            "name": entry.name
                        }
                    )
                )
                response.send({
                    success: true,
                    chats: listContactChats
                })
            }
        }).catch(error => {
            console.log(error);
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
});

/**
 * @api {get} /contacts/search/:member Search for a member
 * @apiName GetSearchResults
 * @apiGroup Contacts
 * 
 * @apiDescription Get all results matching the search entry. Can search for first name, last name,
 *                  username, email. Case insensitive.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {String} Member to search for
 * 
 * @apiSuccess {boolean} success true when the name is inserted
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/search/:member", (request, response, next) => {
    if (!request.params.member) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else {
        next()
    }
}, (request, response) => {
    // Get all results matching request.params.member
    let query = 'SELECT FirstName, LastName, Username, Email FROM Members WHERE LOWER(FirstName) LIKE LOWER($1) ' +
        'OR LOWER(LastName) LIKE LOWER($1) OR LOWER(Username) LIKE LOWER($1) OR LOWER(Email) LIKE LOWER($1)'
    let values = [request.params.member]

    pool.query(query, values)
        .then(result => {
            let searchResults = []
            result.rows.forEach(entry => {
                searchResults.push(
                    {
                        "firstname": entry.firstname,
                        "lastname": entry.lastname,
                        "username": entry.username,
                        "email": entry.email
                    }
                )
            })
            response.send({
                success: true,
                searchResults: searchResults
            })
        }).catch(error => {
            console.log(error);
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
});

module.exports = router