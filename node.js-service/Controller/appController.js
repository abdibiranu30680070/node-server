const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const appService = require('../Service/appService');

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to validate and parse patient data
const parsePatientData = (patientData) => {
  const fieldsToValidate = [
    'age', 'bmi', 'insulin', 'Pregnancies', 'Glucose',
    'BloodPressure', 'SkinThickness', 'DiabetesPedigreeFunction', 'name'
  ];

  for (let field of fieldsToValidate) {
    if ((patientData[field] === undefined || isNaN(patientData[field])) && field !== 'name') {
      throw new Error(`Invalid or missing value for field: ${field}`);
    }
  }

  return {
    name: patientData.name || 'Unknown',
    Age: parseInt(patientData.age, 10) || 0,
    BMI: parseFloat(patientData.bmi) || 0.0,
    Insulin: parseFloat(patientData.insulin) || 0.0,
    Pregnancies: parseInt(patientData.Pregnancies, 10) || 0,
    Glucose: parseFloat(patientData.Glucose) || 0.0,
    BloodPressure: parseFloat(patientData.BloodPressure) || 0.0,
    SkinThickness: parseFloat(patientData.SkinThickness) || 0.0,
    DiabetesPedigreeFunction: parseFloat(patientData.DiabetesPedigreeFunction) || 0.0,
    prediction: false,
    precentage: 0.0,
    userId: patientData.userId,
  };
};

// Risk level determination
const getRiskLevel = (precentage) => {
  if (precentage < 40) {
    return { 
      riskLevel: 'Low', 
      recommendation: 'Maintain a healthy lifestyle and regular checkups.' 
    };
  } else if (precentage < 70) {
    return { 
      riskLevel: 'Moderate', 
      recommendation: 'Monitor health regularly and consider lifestyle improvements.' 
    };
  } else if (precentage < 90) {
    return { 
      riskLevel: 'High', 
      recommendation: 'Consult a doctor and undergo further medical checkups.' 
    };
  } else {
    return { 
      riskLevel: 'Critical', 
      recommendation: 'Immediate medical consultation is required.' 
    };
  }
};

// Send email notification
const sendEmailNotification = async (userEmail, patientName, riskLevel, prediction) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Patient Prediction Results: ${patientName}`,
    text: `Patient Name: ${patientName}\nRisk Level: ${riskLevel}\nPrediction: ${prediction ? 'Diabetic' : 'Not Diabetic'}\n\nPlease review the results in your dashboard.`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email notification');
  }
};

// Prediction endpoint
const predict = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse and validate input
    let patientData = parsePatientData(req.body);
    patientData.userId = userId;
    patientData.name = user.name;

    // Get prediction from ML service
    const predictionResponse = await appService.callPythonService(patientData);
    if (!predictionResponse) {
      throw new Error('Prediction service unavailable');
    }

    // Determine best model result
    const bestModel = Object.entries(predictionResponse).reduce((best, [model, data]) => {
      return data.precentage > best.precentage ? { model, ...data } : best;
    }, { precentage: 0 });

    // Set risk level and recommendation
    const { riskLevel, recommendation } = getRiskLevel(bestModel.precentage);
    patientData.prediction = bestModel.prediction;
    patientData.precentage = bestModel.precentage;
    patientData.riskLevel = riskLevel;
    patientData.recommendation = recommendation;

    // Save patient record
    const patient = await appService.createPatient(patientData);

    // Create notification
    await prisma.notification.create({
      data: {
        patientId: patient.Id,
        message: `New prediction for ${patient.name}: ${riskLevel} risk`,
        isRead: false,
      },
    });

    // Send email notification
    await sendEmailNotification(
      user.email,
      patient.name,
      patient.riskLevel,
      patient.prediction
    );

    return res.status(200).json({
      prediction: patient.prediction,
      precentage: patient.precentage,
      riskLevel: patient.riskLevel,
      recommendation: patient.recommendation,
    });

  } catch (error) {
    console.error('Prediction error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Get all patients for user
const getAllPatients = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const patients = await prisma.patient.findMany({
      where: { userId },
      orderBy: { CreatedAt: 'desc' },
    });

    return res.status(200).json(patients || []);

  } catch (error) {
    console.error('Error fetching patients:', error);
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

// Get single patient details
const getPatientDetails = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const patientId = parseInt(req.params.id, 10);

    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    if (isNaN(patientId)) return res.status(400).json({ error: 'Invalid patient ID' });

    const patient = await prisma.patient.findFirst({
      where: { Id: patientId, userId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.status(200).json(patient);

  } catch (error) {
    console.error('Error fetching patient:', error);
    return res.status(500).json({ error: 'Failed to fetch patient details' });
  }
};

module.exports = { 
  predict, 
  getAllPatients, 
  getPatientDetails 
};
