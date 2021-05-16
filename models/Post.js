const postsCollection = require('../db').db().collection("posts")
const followsCollection = require('../db').db().collection("follows")
const ObjectID = require('mongodb').ObjectID
const User = require('./User')
const sanitizeHTML = require('sanitize-html')

class Post {
    constructor(data, userid, requestedPostId) {
        this.data = data
        this.errors = []
        this.userid = userid
        this.requestedPostId = requestedPostId
    }
    //cleanup the data
    cleanUp() {
        if (typeof (this.data.title) != "string") {
            this.data.title = ""
        }
        if (typeof (this.data.body) != "string") {
            this.data.body = ""
        }

        // get rid of any bogus properties 
        this.data = {
            title: sanitizeHTML(this.data.title.trim(), {
                allowedAttributes: {},
                allowedTags: []
            }),
            body: sanitizeHTML(this.data.body.trim(), {
                allowedAttributes: {},
                allowedTags: []
            }),
            createDate: new Date(),
            author: ObjectID(this.userid)
        }
    }
    //validate the data
    validate() {
        if (this.data.title == "") {
            this.errors.push("A title is necessary to create a post.")
        }

        if (this.data.body == "") {
            this.errors.push("You must provide post content")
        }
    }
    create() {
        return new Promise((resolve, reject) => {
            this.cleanUp()
            this.validate()
            if (!this.errors.length) {
                // save post into database
                postsCollection.insertOne(this.data).then((info) => {
                    resolve(info.ops[0]._id)
                }).catch(() => {
                    this.errors.push("Please try again later.")
                    reject(this.errors)
                })
            } else {
                reject(this.errors)
            }
        })
    }
    update() {
        return new Promise(async (resolve, reject) => {
            try {
                let post = await Post.findSingleById(this.requestedPostId, this.userid)

                if (post.isVisitorOwner) {
                    // update the db here
                    let status = await this.actuallyUpdate()

                    resolve(status)
                } else {
                    reject()
                }

            } catch {
                reject()
            }
        })
    }
    actuallyUpdate() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp()
            this.validate()
            if (!this.errors.length) {
                await postsCollection.findOneAndUpdate({ _id: new ObjectID(this.requestedPostId) }, { $set: { title: this.data.title, body: this.data.body } })
                resolve("success")
            } else {
                resolve("failure")
            }
        })
    }
    static reuseablePostQuery(uniqueOperations, visitorId) {
        return new Promise(async function (resolve, reject) {

            let aggOperations = uniqueOperations.concat([
                { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorDocument" } },
                {
                    $project: {
                        title: 1,
                        body: 1,
                        createDate: 1,
                        authorId: "$author",
                        author: { $arrayElemAt: ["$authorDocument", 0] }
                    }
                }
            ])

            let posts = await postsCollection.aggregate(aggOperations).toArray()

            // clean up the author propert in each post object
            posts = posts.map(function (post) {

                post.isVisitorOwner = post.authorId.equals(visitorId)
                post.authorId = undefined

                post.author = {
                    username: post.author.username,
                    avatar: new User(post.author, true).avatar
                }

                return post
            })

            resolve(posts)
        })
    }
    static findSingleById(id, visitorId) {
        return new Promise(async function (resolve, reject) {
            if (typeof (id) != "string" || !ObjectID.isValid(id)) {
                reject()
                return
            }

            let posts = await Post.reuseablePostQuery([
                { $match: { _id: new ObjectID(id) } }
            ], visitorId)

            if (posts.length) {
                resolve(posts[0])
            } else {
                reject()
            }
        })
    }
    static findByAuthorId(authorId) {
        return Post.reuseablePostQuery([
            { $match: { author: authorId } },
            { $sort: { createDate: -1 } }
        ])
    }
    static delete(postIdToDelete, currentUserId) {
        return new Promise(async (resolve, reject) => {
            try {
                let post = await Post.findSingleById(postIdToDelete, currentUserId)
                if (post.isVisitorOwner) {
                    await postsCollection.deleteOne({ _id: new ObjectID(postIdToDelete) })
                    resolve()
                } else {
                    reject()
                }
            } catch {
                reject()
            }
        })
    }
    static search(searchTerm) {
        return new Promise(async (resolve, reject) => {
            if (typeof (searchTerm) == "string") {
                let posts = await Post.reuseablePostQuery([
                    { $match: { $text: { $search: searchTerm } } },
                    { $sort: { score: { $meta: "textScore" } } }
                ])
                resolve(posts)
            } else {
                reject()
            }
        })
    }
    static countPostsByAuthor(id) {
        return new Promise(async (resolve, reject) => {
            let postCount = await postsCollection.countDocuments({ author: id })
            resolve(postCount)
        })
    }
    static async getFeed(id) {
        // create an array of the user ids that the current user follows.
        let followedUsers = await followsCollection.find({ authorId: new ObjectID(id) }).toArray()
        followedUsers = followedUsers.map(function (followDoc) {
            return followDoc.followedId
        })
        // look for posts where the autor is in the above array of followed users
        return Post.reuseablePostQuery([
            { $match: { author: { $in: followedUsers } } },
            { $sort: { createDate: -1 } }
        ])

    }
}


module.exports = Post