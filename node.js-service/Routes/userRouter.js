// userRouter.js
const express = require('express');
const userController = require('../Controller/userController');
const router = express.Router();

// Authentication routes
router.post("/login", userController.login);
router.post("/register", userController.register);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// User routes
router.get("/user", userController.getUser);
router.post("/feedback", userController.submitFeedback);

module.exports = router;
