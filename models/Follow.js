const usersCollection = require('../db').db().collection("users")
const followsCollection = require('../db').db().collection("follows")
const ObjectID = require('mongodb').ObjectID
const User = require('./User')


class Follow {
    constructor(followedUsername, authorId) {
        this.followedUsername = followedUsername
        this.authorId = authorId
        this.errors = []
    }
    cleanUp() {
        if (typeof (this.followedUsername) != "string") {
            this.followedUsername = ""
        }
    }
    async validate(action) {
        // followed username must exist in db
        let followedAccount = await usersCollection.findOne({ username: this.followedUsername })
        if (followedAccount) {
            this.followedId = followedAccount._id
        } else {
            this.errors.push("You cannot follow a user that does not exist")
        }


        let doesFollowAlreadyExist = await followsCollection.findOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) })

        if (action == "create") {
            if (doesFollowAlreadyExist) {
                this.errors.push("You are already following this user.")
            }
        }

        if (action == "delete") {
            if (!doesFollowAlreadyExist) {
                this.errors.push("You cannot stop following someone you do not already follow.")
            }
        }

        // should not be able to follow yourself
        if (this.followedId.equals(this.authorId)) {
            this.errors.push("You cannot follow yourself.")
        }

    }
    create() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp()
            await this.validate("create")
            if (!this.errors.length) {
                await followsCollection.insertOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) })
                resolve()
            } else {
                reject(this.errors)
            }
        })
    }
    delete() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp()
            await this.validate("delete")
            if (!this.errors.length) {
                await followsCollection.deleteOne({ followedId: this.followedId, authorId: new ObjectID(this.authorId) })
                resolve()
            } else {
                reject(this.errors)
            }
        })
    }
    static async isVisitorFollowing(followedId, visitorId) {
        let followDoc = await followsCollection.findOne({ followedId: followedId, authorId: new ObjectID(visitorId) })

        if (followDoc) {
            return true
        } else {
            return false
        }
    }
    static getFollowersById(id) {
        return new Promise(async (resolve, reject) => {
            try {
                let followers = await followsCollection.aggregate([
                    { $match: { followedId: id } },
                    { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "userDoc" } },
                    {
                        $project: {
                            username: { $arrayElemAt: ["$userDoc.username", 0] },
                            email: { $arrayElemAt: ["$userDoc.email", 0] }
                        }
                    }
                ]).toArray()
                followers = followers.map(function (follower) {
                    let user = new User(follower, true)
                    return { username: follower.username, avatar: user.avatar }
                })
                resolve(followers)
            } catch {
                reject()
            }
        })
    }
    static getFollowingById(id) {
        return new Promise(async (resolve, reject) => {
            try {
                let followers = await followsCollection.aggregate([
                    { $match: { authorId: id } },
                    { $lookup: { from: "users", localField: "followedId", foreignField: "_id", as: "userDoc" } },
                    {
                        $project: {
                            username: { $arrayElemAt: ["$userDoc.username", 0] },
                            email: { $arrayElemAt: ["$userDoc.email", 0] }
                        }
                    }
                ]).toArray()
                followers = followers.map(function (follower) {
                    let user = new User(follower, true)
                    return { username: follower.username, avatar: user.avatar }
                })
                resolve(followers)
            } catch {
                reject()
            }
        })
    }
    static countFollowersById(id) {
        return new Promise(async (resolve, reject) => {
            let followerCount = await followsCollection.countDocuments({ followedId: id })
            resolve(followerCount)
        })
    }
    static countFollowingById(id) {
        return new Promise(async (resolve, reject) => {
            let count = await followsCollection.countDocuments({ authorId: id })
            resolve(count)
        })
    }
}


module.exports = Follow