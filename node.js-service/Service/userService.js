require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const queries = require("../database/queries");

// ======================
// Validation Utilities
// ======================
const validateEmailAndPassword = (email, pass) => {
  if (!email || !email.includes("@")) return false;
  if (!pass || pass.length < 8) return false;
  return true;
};

// ======================
// User Authentication
// ======================
const checkIfFound = async (email) => {
  try {
    const user = await queries.findUserByEmail(email);
    return user || null;
  } catch (error) {
    console.error("Error checking for user:", error);
    throw new Error("User lookup failed");
  }
};

const registerUser = async (email, name, pass, requesterRole = "user", role = "user") => {
  if (role === "admin" && requesterRole !== "admin") {
    throw new Error("Admin privileges required to create admin accounts");
  }

  try {
    const encryptedPassword = await bcrypt.hash(pass, 10);
    return await queries.createUser(email, name, encryptedPassword, role);
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("User registration failed");
  }
};

const verifyPassword = async (enteredPassword, storedHash) => {
  try {
    return await bcrypt.compare(enteredPassword, storedHash);
  } catch (error) {
    console.error("Error verifying password:", error);
    throw new Error("Password verification failed");
  }
};

// ======================
// Admin Functions
// ======================
const getAllUsers = async () => {
  try {
    return await queries.getAllUsers();
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to retrieve users");
  }
};

const updateUserRole = async (userId, newRole, adminId) => {
  try {
    const admin = await queries.findUserById(adminId);
    if (admin.id === userId && newRole !== "admin") {
      throw new Error("Admins cannot demote themselves");
    }
    return await queries.updateUserRole(userId, newRole);
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error("Role update failed");
  }
};

const deleteUser = async (userId) => {
  try {
    return await queries.deleteUser(userId);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("User deletion failed");
  }
};

// ======================
// Password Reset
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

    // In production: await sendPasswordResetEmail(email, resetToken);
    return {
      message: "Password reset initiated",
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined
    };
  } catch (error) {
    console.error("Password reset initiation error:", error);
    throw new Error(`Password reset failed: ${error.message}`);
  }
};

const verifyPasswordResetToken = async (token, email) => {
  try {
    const user = await checkIfFound(email);
    if (!user) throw new Error("User not found");
    if (!user.resetToken || !user.resetTokenExpiry) throw new Error("Invalid reset token");
    if (Date.now() > new Date(user.resetTokenExpiry).getTime()) throw new Error("Reset token has expired");

    const isValidToken = await bcrypt.compare(token, user.resetToken);
    if (!isValidToken) throw new Error("Invalid reset token");

    return true;
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

const updateUserPassword = async (email, newPassword) => {
  try {
    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const user = await checkIfFound(email);
    if (!user) throw new Error("User not found");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await queries.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    return { message: "Password updated successfully" };
  } catch (error) {
    console.error("Password update error:", error);
    throw new Error(`Password update failed: ${error.message}`);
  }
};

// ======================
// Module Exports
// ======================
module.exports = {
  validateEmailAndPassword,
  checkIfFound,
  registerUser,
  verifyPassword,
  getAllUsers,
  updateUserRole,
  deleteUser,
  initiatePasswordReset,
  verifyPasswordResetToken,
  updateUserPassword
};
