const userServices = require("../Service/userService");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const user = await userServices.checkIfFound(email);
    if (!user) {
      return res.status(404).json({ error: "User not found. Please signup" });
    }

    // Verify credentials
    const validPassword = await userServices.verifyPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Define allowed admin roles
    const adminRoles = ["superadmin", "admin", "moderator"];
    
    // Assign default role if not provided
    const userRole = adminRoles.includes(user.role) ? user.role : "user";

    // Generate token
    const token = auth.generateToken({
      userId: user.id,
      email: user.email,
      role: userRole
    });

    if (!token) {
      return res.status(500).json({ error: "Token generation failed" });
    }

    // Send token to frontend
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const register = async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await userServices.checkIfFound(email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const userRole = ["superadmin", "admin", "moderator"].includes(role) ? role : "user";

    const newUser = await userServices.registerUser(email, name, password, userRole);
    const token = auth.generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: userRole
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: userRole
      },
      token
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message || "Registration failed" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await userServices.initiatePasswordReset(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;
    
    // Verify token first
    await userServices.verifyPasswordResetToken(token, email);
    
    // Update password
    const result = await userServices.updateUserPassword(email, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.TOKEN);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true }
    });

    if (!user || !user.name) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ username: user.name });

  } catch (err) {
    console.error("Error decoding token:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const submitFeedback = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.TOKEN);
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Feedback message is required" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        message,
        userId: decoded.userId,
      },
    });

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });

  } catch (err) {
    console.error("Feedback submission error:", err);
    return res.status(401).json({ error: "Invalid token or user unauthorized" });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getUser,
  submitFeedback
};
