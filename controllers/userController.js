const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt = require('jsonwebtoken')


exports.apiGetPostByUsername = async function (req, res) {
    try {
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts)
    } catch {
        res.json("Sorry Invalid User Requested.")
    }
}


exports.doesUsernameExist = function (req, res) {
    User.findByUsername(req.body.username).then(function () {
        res.json(true)
    }).catch(function () {
        res.json(false)
    })
}

exports.doesEmailExist = async function (req, res) {
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}


exports.sharedProfileData = async function (req, res, next) {
    let isVisitorsProfile = false
    let isFollowing = false
    if (req.session.user) {
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    }
    req.isVisitorsProfile = isVisitorsProfile
    req.isFollowing = isFollowing

    //retrieve post, follower and following count
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followerCountPromise = Follow.countFollowersById(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingById(req.profileUser._id)
    let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])

    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount

    next()
}


exports.mustBeLoggedIn = function (req, res, next) {
    if (req.session.user) {
        next()
    } else {
        req.flash('errors', 'You must be logged in to perform this action')
        req.session.save(function () {
            res.redirect('/')
        })
    }
}

exports.apiMustBeLoggedIn = function (req, res, next) {
    try {
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        next()
    } catch {
        res.json("Sorry you must provide a valid token.")
    }
}

exports.login = function (req, res) {
    //defines the user data
    let user = new User(req.body)
    //if user login model works
    user.login().then(function (result) {
        //sends session data for keeping them logged in
        req.session.user = { username: user.data.username, avatar: user.avatar, _id: user.data._id }
        req.session.save(function () {
            res.redirect('/')
        })
    }).catch(function (e) {
        //sends flash error report
        req.flash('errors', e)
        req.session.save(function () {
            res.redirect('/')
        })
    })
}

//api login function is here...
exports.apiLogin = function (req, res) {
    //defines the user data
    let user = new User(req.body)
    //if user login model works
    user.login().then(function (result) {
        res.json(jwt.sign({ _id: user.data._id }, process.env.JWTSECRET, { expiresIn: "7d" }))
    }).catch(function (e) {
        res.json("Sorry, Your values are not correct.")
    })
}

exports.logout = function (req, res) {
    //destroys session data to log someone out.
    req.session.destroy(function () {
        res.redirect('/')
    })

}

exports.register = function (req, res) {
    //creates a new user through the User Constructor
    let user = new User(req.body)
    user.register().then(() => {
        //sends session data to keep them logged in.
        req.session.user = { username: user.data.username, avatar: user.avatar, _id: user.data._id }
        req.session.save(function () {
            res.redirect('/')
        })
    }).catch((regErrors) => {
        regErrors.forEach(function (error) {
            req.flash('regErrors', error)
        })
        req.session.save(function () {
            res.redirect('/')
        })
    })


}

exports.home = async function (req, res) {
    if (req.session.user) {
        // fetch feed of posts for currentUser 

        let posts = await Post.getFeed(req.session.user._id)

        res.render('home-dashboard', { posts: posts, title: 'Home' })
    } else {
        res.render('home-guest', { regErrors: req.flash('regErrors'), title: 'Log-in/Register' })
    }
}

exports.ifUserExists = function (req, res, next) {
    User.findByUsername(req.params.username).then(function (userDocument) {
        req.profileUser = userDocument
        next()

    }).catch(function () {
        res.render("404")
    })
}

exports.profilePostsScreen = function (req, res) {
    //ask our post model for posts by a certain author ID
    Post.findByAuthorId(req.profileUser._id).then(function (posts) {
        res.render('profile', {
            title: `Profile for ${req.profileUser.username} `,
            currentPage: "posts",
            posts: posts,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount }
        })
    }).catch(function () {
        res.render("404")
    })


}

exports.profileFollowersScreen = async function (req, res) {
    try {
        let followers = await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers', {
            title: `Followers of ${req.profileUser.username}`,
            currentPage: "followers",
            followers: followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount }
        })
    } catch {
        res.render("404")
    }
}

exports.profileFollowingScreen = async function (req, res) {
    try {
        let following = await Follow.getFollowingById(req.profileUser._id)
        res.render('profile-following', {
            title: `${req.profileUser.username} is following`,
            currentPage: "following",
            following: following,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount }
        })
    } catch {
        res.render("404")
    }
}


