const Post = require('../models/Post')
const sendgrid = require('@sendgrid/mail')

sendgrid.setApiKey(process.env.SENDGRIDAPIKEY)
//rendering the create-post
exports.viewCreateScreen = function(req, res) {
    res.render('create-post', {title: "Create a Post"})
}

//creating a post 
exports.create = function (req, res) {
    let post = new Post(req.body, req.session.user._id)
    post.create().then(function (newId) {
        sendgrid.send({
            to: 'djrayhan8@gmail.com',
            from: 'hello@eggbook.com',
            subject: 'Congrats.',
            text: 'you just created your first post. Congrats on creating your first Post.',
            html: 'you just <strong>created your first post.</strong> Congrats on creating your first Post.'
        })
        req.flash("success", "New Post Successfully Created.")
        req.session.save(() => res.redirect(`post/${newId}`))
    }).catch(function (errors) {
        errors.forEach(error => req.flash("errors", error))
        req.session.save(() => res.redirect('/create-post'))
    })
}

exports.apiCreate = function (req, res) {
    let post = new Post(req.body, req.apiUser._id)
    post.create().then(function (newId) {
        res.json("Congrats.")
    }).catch(function (errors) {
        res.json(errors)
    })
}

exports.viewSingle = async function (req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen', {post: post, title: post.title})
    } catch (error) {
        res.render('404')
    }
}

exports.viewEditScreen = async function(req, res) {
    try {
      let post = await Post.findSingleById(req.params.id, req.visitorId)
      if (post.isVisitorOwner) {
        res.render("edit-post", {post: post, title: "Edit Post"})
      } else {
        req.flash("errors", "You do not have permission to perform that action.")
        req.session.save(() => res.redirect("/"))
      }
    } catch {
      res.render("404")
    }
  }

exports.edit = function (req, res) {
    let post = new Post(req.body, req.visitorId, req.params.id)
    post.update().then( (status) => {
        // the post was successfully updated in the database
        // or user did have permission, but there where validation errors.
        if (status == "success") {
            //post was updated in db
            req.flash("success", "Post was successfully updated")
            req.session.save(function() {
                res.redirect(`/post/${req.params.id}/edit`)
            })

        } else {
            post.errors.forEach(function(error) {
                req.flash("errors", error)
                req.session.save(function () {
                    res.redirect(`/post/${req.params.id}/edit`)
                })
            })
        }

    }).catch(() => {
        // a post with the requested id doesn't exist
        // or the current visitor is not the owner of the post
        req.flash("errors", "You do not have the permission to perform this action.")
        req.session.save(function () {
            res.redirect("/")
        })
    })
}


exports.delete = function (req, res) {
    Post.delete(req.params.id, req.visitorId).then(() => {
        req.flash("success", "The post was succesfully deleted.")
        req.session.save( () => {
            res.redirect(`/profile/${req.session.user.username}`)
        })
    }).catch(() => {
        req.flash("errors", "You do not have permission to perform that action.")
        req.session.save(() => res.redirect('/'))
    })
}

exports.apiDelete = function (req, res) {
    Post.delete(req.params.id, req.apiUser._id).then(() => {
        res.json("Deleted Successfully.")
    }).catch(() => {
        res.json("You do not have permission to perform this action.")
    })
}

exports.search = function (req, res) {
    Post.search(req.body.searchTerm).then( posts => {
        res.json(posts)
    }).catch(() => {
        res.json([])
    })
}