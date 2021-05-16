const bcrypt = require('bcryptjs')
const usersCollection = require('../db').db().collection("users")
const validator = require('validator')
const md5 = require('md5')

//user constructor
class User {
    constructor(data, getAvatar) {
        this.data = data
        this.errors = []
        if (getAvatar == undefined) {
            getAvatar = false
        }
        if (getAvatar) { this.getAvatar() }
    }
    cleanUp() {
        //only accepts strings 
        if (typeof (this.data.username) != "string") {
            this.data.username = ""
        }
        if (typeof (this.data.email) != "string") {
            this.data.email = ""
        }
        if (typeof (this.data.password) != "string") {
            this.data.password = ""
        }

        // get rid of any bogus properties
        this.data = {
            username: this.data.username.trim().toLowerCase(),
            email: this.data.email.trim().toLowerCase(),
            password: this.data.password
        }
    }
    validate() {
        return new Promise(async (resolve, reject) => {
            // checks if data is blank
            if (this.data.username == "") {
                this.errors.push("You must provide a username")
            }
            if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {
                this.errors.push("Username can only contain Letters and Numbers")
            }
            if (!validator.isEmail(this.data.email)) {
                this.errors.push("You must provide a valid email address")
            }
            if (this.data.password == "") {
                this.errors.push("You must provide a password")
            }
            // checks the password min and max length
            if (this.data.password.length > 0 && this.data.password.length < 8) {
                this.errors.push("Password must be at least 8 characters")
            }
            if (this.data.password.length > 30) {
                this.errors.push("Passowrds cannot exceed 30 characters")
            }
            // checks the Usernames min and max length
            if (this.data.username.length > 0 && this.data.username.length < 3) {
                this.errors.push("Username must have at least 3 characters")
            }
            if (this.data.username.length > 30) {
                this.errors.push("Username cannot exceed 30 characters")
            }

            // Only if username is valid then checks if it's already taken.
            if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
                let usernameExists = await usersCollection.findOne({ username: this.data.username })
                if (usernameExists) {
                    this.errors.push('This Username is already taken. Try something different')
                }
            }

            // Only if Email is valid then checks if it's already taken.
            if (validator.isEmail(this.data.email)) {
                let emailExists = await usersCollection.findOne({ email: this.data.email })
                if (emailExists) {
                    this.errors.push('This Email is already taken. Try something different')
                }
            }
            resolve()

        })
    }
    login() {
        //returns a promise
        return new Promise((resolve, reject) => {
            //cleans up the data first
            this.cleanUp()
            //finds the data from db
            usersCollection.findOne({ username: this.data.username }).then((attemptedUser) => {
                if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                    this.data = attemptedUser
                    this.getAvatar()
                    resolve("Congrats!!")
                } else {
                    reject("Invalid Username/Password, Please try again.")
                }
            }).catch(function () {
                reject("Please Try Again Later")
            })
        })
    }
    register() {
        return new Promise(async (resolve, reject) => {
            // step #1: Validate user Data
            this.cleanUp()
            await this.validate()

            // step #2: Only if there are no validation errors, then save userdata in the database.
            if (!this.errors.length) {
                //hashing the password here
                let salt = bcrypt.genSaltSync(10)
                this.data.password = bcrypt.hashSync(this.data.password, salt)
                //inserting data to the db
                await usersCollection.insertOne(this.data)
                // getting the avatar
                this.getAvatar()
                resolve()
            } else {
                reject(this.errors)
            }

        })
    }
    getAvatar() {
        this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
    }
    static findByUsername(username) {
        return new Promise(function (resolve, reject) {
            if (typeof (username) != "string") {
                reject()
                return
            }

            usersCollection.findOne({ username: username }).then(function (userDoc) {
                if (userDoc) {
                    userDoc = new User(userDoc, true)
                    userDoc = {
                        _id: userDoc.data._id,
                        username: userDoc.data.username,
                        avatar: userDoc.avatar
                    }
                    resolve(userDoc)
                } else {
                    reject()
                }
            }).catch(function () {
                reject()
            })
        })
    }
    static doesEmailExist(email) {
        return new Promise(async function (resolve, reject) {
            if (typeof (email) != "string") {
                resolve(false)
                return
            }


            let user = await usersCollection.findOne({ email: email })
            if (user) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    }
}


module.exports = User