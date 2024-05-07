// Import necessary libraries
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS options for cross-origin allowance
const corsOptions = {
  origin: 'https://www.fcec.sa', // Set your allowed origin here
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// MongoDB URI from environment
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Mongoose schema definition
const applicationFormSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  profession: String,
  address: String,
  education: [{
    highestEducation: String,
    fieldOfStudy: String,
    institute: String,
  }],
  experience: [{
    companyName: String,
    positionTitle: String,
    yearsOfExperience: Number,
  }],
  skills: [String],
  resume: String,
});

const ApplicationForm = mongoose.model('ApplicationForm', applicationFormSchema);

// SMTP transporter configuration using Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_EMAIL,
    pass: process.env.OUTLOOK_PASSWORD,
  },
});

// Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Route to handle form submission
app.post('/submit-form', upload.single('resume'), async (req, res) => {
  const {
    firstName, lastName, email, phone, profession, address,
    highestEducation, fieldOfStudy, institute,
    companyName, positionTitle, yearsOfExperience, skills
  } = req.body;

  let resumePath = req.file ? req.file.path : null;
  let encodedFile = null;

  if (resumePath) {
    encodedFile = fs.readFileSync(resumePath, { encoding: 'base64' });
    fs.unlinkSync(resumePath); // Clean up the uploaded file after processing
  }

  try {
    // Create a new document in MongoDB
    const newApplication = new ApplicationForm({
      firstName, lastName, email, phone, profession, address,
      education: { highestEducation, fieldOfStudy, institute },
      experience: { companyName, positionTitle, yearsOfExperience },
      skills, resume: encodedFile
    });
    await newApplication.save();

    // Setup email options
    const mailOptions = {
      from: process.env.OUTLOOK_EMAIL,
      to: email, // Sending email to the applicant or admin
      subject: 'New Application Submission',
      text: `Hi ${firstName}, thank you for submitting your application.`,
      attachments: [{
        filename: 'resume.pdf',
        content: encodedFile,
        encoding: 'base64'
      }]
    };

    // Send the email with the resume attached
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log('Error sending mail:', error);
        res.status(500).send('Error sending email');
      } else {
        console.log('Email sent:', info.response);
        res.send('Application submitted successfully and email sent.');
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('An error occurred during form submission.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to my application!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
