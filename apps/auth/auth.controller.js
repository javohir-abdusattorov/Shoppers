const passport = require('passport')
const { Router } = require('express')
const router = Router()
const AuthService = require('./auth.service')
const service = new AuthService()
const { protect, authorize } = require('../../middleware/auth')

router.post('/register', service.register)
router.post('/register-seller', protect, authorize('admin'), service.registerSeller)
router.post('/login', service.login)
router.post('/forgot-password', service.fortgotPassword)

router.get('/google', passport.authenticate('google', { scope: ['profile'] }))
router.get('/google/redirect', passport.authenticate('google', { failureRedirect: '/', session: false }), service.googleRedirect)

router.get('/facebook', passport.authenticate('facebook', { scope: ['profile'] }))
router.get('/facebook/redirect', passport.authenticate('facebook', { failureRedirect: '/', session: false }), service.facebookRedirect)

router.get('/me', protect, service.getMe)

router.put('/edit', protect, service.editUser)
router.put('/edit-address', protect, authorize('customer'), protect, service.editCustomerAddress)
router.put('/reset-password/:resettoken', service.resetPassword)
router.put('/block-seller/:id', protect, authorize('admin'), service.blockSeller)


module.exports = router