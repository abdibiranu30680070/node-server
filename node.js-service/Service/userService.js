require("dotenv").config();
const jwt = require("jsonwebtoken");
<<<<<<< HEAD
const queries = require("../database/queries");
const bcrypt = require("bcrypt");

// Validate email and password
const validateEmailAndPassword = (email, pass) => {
  if (!email || !email.includes("@")) {
    return false;
  }
  if (!pass || pass.length < 8) {
    return false;
  }
  return true;
};

// Check if the user already exists
const checkIfFound = async (email) => {
  const oldUser = await queries.findUserByEmail(email); // FIXED function name
  return oldUser ? oldUser : null;
};

const registerUser = async (email, name, pass, requesterRole = "user", role = "user") => {
  // Only admins can create admin accounts
=======
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const queries = require("../database/queries");
// const { sendPasswordResetEmail } = require('./emailService'); // Uncomment when you add email service

// ======================
// Validation
// ======================
const validateEmailAndPassword = (email, pass) => {
  if (!email || !email.includes("@")) return false;
  if (!pass || pass.length < 8) return false;
  return true;
};

// ======================
// User Auth Logic
// ======================
const checkIfFound = async (email) => {
  const user = await queries.findUserByEmail(email);
  return user || null;
};

const registerUser = async (email, name, pass, requesterRole = "user", role = "user") => {
>>>>>>> 1845fcf (Initial commit)
  if (role === "admin" && requesterRole !== "admin") {
    throw new Error("Admin privileges required to create admin accounts");
  }

  const encryptedPassword = await bcrypt.hash(pass, 10);
  return queries.createUser(email, name, encryptedPassword, role);
};
<<<<<<< HEAD
// Verify password (missing function)
const verifyPassword = async (enteredPassword, storedHash) => {
  return bcrypt.compare(enteredPassword, storedHash);
};
// --------------------------
// ADMIN-ONLY FUNCTIONS
// --------------------------

// Get all users (admin only)
const getAllUsers = async () => {
  return queries.getAllUsers(); // Ensure queries.js has this function
};

// Promote/demote users
const updateUserRole = async (userId, newRole, adminId) => {
  // Prevent self-demotion
=======

const verifyPassword = async (enteredPassword, storedHash) => {
  return bcrypt.compare(enteredPassword, storedHash);
};

// ======================
// Admin Utilities
// ======================
const getAllUsers = async () => {
  return queries.getAllUsers();
};

const updateUserRole = async (userId, newRole, adminId) => {
>>>>>>> 1845fcf (Initial commit)
  const admin = await queries.findUserById(adminId);
  if (admin.id === userId && newRole !== "admin") {
    throw new Error("Admins cannot demote themselves");
  }
  return queries.updateUserRole(userId, newRole);
};

<<<<<<< HEAD
// Delete user (admin only)
const deleteUser = async (userId) => {
  return queries.deleteUser(userId);
};
// In userService.js - Add these new functions
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('./emailService');

const initiatePasswordReset = async (email) => {
  try {
    // Validate email format
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Check if user exists
    const user = await checkIfFound(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await queries.updateUser(user.id, {
       resetToken: await bcrypt.hash(resetToken, 10),
       resetTokenExpiry: resetTokenExpiry // Now a Date object
    });

    // Send email (implementation depends on your email service)
    // await sendPasswordResetEmail(email, resetToken);
    const initiatePasswordReset = async (email) => {
      try {
        const user = await checkIfFound(email);
        if (!user) throw new Error('User not found');
    
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
        // Update using proper query method
        await queries.updateUser(user.id, {
          resetToken: await bcrypt.hash(resetToken, 10),
          resetTokenExpiry: resetTokenExpiry
        });
    
        return { 
          message: 'Password reset initiated',
          resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        };
      } catch (error) {
        throw new Error(`Password reset failed: ${error.message}`);
      }
    };

    return { message: 'Password reset email sent' };
=======
const deleteUser = async (userId) => {
  return queries.deleteUser(userId);
};

// ======================
// Password Reset Logic
// ======================
const initiatePasswordReset = async (email) => {
  try {
    const user = await checkIfFound(email);
    if (!user) throw new Error("User not found");

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await queries.updateUser(user.id, {
      resetToken: await bcrypt.hash(resetToken, 10),
      resetTokenExpiry: resetTokenExpiry
    });

    // Send email (placeholder)
    // await sendPasswordResetEmail(email, resetToken);

    return {
      message: "Password reset initiated",
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined
    };
>>>>>>> 1845fcf (Initial commit)
  } catch (error) {
    throw new Error(`Password reset initiation failed: ${error.message}`);
  }
};

const verifyPasswordResetToken = async (token, email) => {
  try {
<<<<<<< HEAD
    // Find user by email
    const user = await checkIfFound(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Check token validity
    if (!user.resetToken || !user.resetTokenExpiry) {
      throw new Error('Invalid reset token');
    }

    // Verify token hasn't expired
    if (Date.now() > user.resetTokenExpiry) {
      throw new Error('Reset token has expired');
    }

    // Verify token matches
    const isValidToken = await bcrypt.compare(token, user.resetToken);
    if (!isValidToken) {
      throw new Error('Invalid reset token');
    }
=======
    const user = await checkIfFound(email);
    if (!user) throw new Error("User not found");
    if (!user.resetToken || !user.resetTokenExpiry) throw new Error("Invalid reset token");
    if (Date.now() > new Date(user.resetTokenExpiry)) throw new Error("Reset token has expired");

    const isValidToken = await bcrypt.compare(token, user.resetToken);
    if (!isValidToken) throw new Error("Invalid reset token");
>>>>>>> 1845fcf (Initial commit)

    return true;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

const updateUserPassword = async (email, newPassword) => {
  try {
<<<<<<< HEAD
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Find user
    const user = await checkIfFound(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
=======
    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const user = await checkIfFound(email);
    if (!user) throw new Error("User not found");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

>>>>>>> 1845fcf (Initial commit)
    await queries.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

<<<<<<< HEAD
    return { message: 'Password updated successfully' };
=======
    return { message: "Password updated successfully" };
>>>>>>> 1845fcf (Initial commit)
  } catch (error) {
    throw new Error(`Password update failed: ${error.message}`);
  }
};

<<<<<<< HEAD

module.exports = {
  // Existing exports
  validateEmailAndPassword,
  registerUser,
  checkIfFound,
=======
// ======================
// Exports
// ======================
module.exports = {
  validateEmailAndPassword,
  checkIfFound,
  registerUser,
>>>>>>> 1845fcf (Initial commit)
  verifyPassword,
  getAllUsers,
  updateUserRole,
  deleteUser,
  initiatePasswordReset,
  verifyPasswordResetToken,
<<<<<<< HEAD
  updateUserPassword,
  initiatePasswordReset
};
=======
  updateUserPassword
};
>>>>>>> 1845fcf (Initial commit)
