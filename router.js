const express = require('express')
const router = express.Router()
const userController = require('./controllers/userController')
const postController = require('./controllers/postController')
const followController = require('./controllers/followController')
//user related route
//get for homepage
router.get('/', userController.home)
//post for registration
router.post('/register', userController.register)
//post for login
router.post('/login', userController.login)
//post for logout
router.post('/logout', userController.logout)

router.post('/doesUsernameExist', userController.doesUsernameExist)

router.post('/doesEmailExist', userController.doesEmailExist)


//profile related routes
router.get('/profile/:username', userController.ifUserExists, userController.sharedProfileData, userController.profilePostsScreen)

router.get('/profile/:username/followers', userController.ifUserExists, userController.sharedProfileData, userController.profileFollowersScreen)

router.get('/profile/:username/following', userController.ifUserExists, userController.sharedProfileData, userController.profileFollowingScreen)




//post related route
//get for create-post
router.get('/create-post', userController.mustBeLoggedIn, postController.viewCreateScreen)

//post for create-post
router.post('/create-post', userController.mustBeLoggedIn, postController.create)

router.get('/post/:id', postController.viewSingle)

router.get('/post/:id/edit', userController.mustBeLoggedIn, postController.viewEditScreen)

router.post('/post/:id/edit', userController.mustBeLoggedIn, postController.edit)

router.post('/post/:id/delete', userController.mustBeLoggedIn, postController.delete)



//search related route

router.post('/search', postController.search)


//follow related routes

router.post('/addFollow/:username', userController.mustBeLoggedIn, followController.addFollow)

router.post('/removeFollow/:username', userController.mustBeLoggedIn, followController.removeFollow)


module.exports = router