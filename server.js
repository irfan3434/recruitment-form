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

const corsOptions = {
  origin: 'https://www.fcec.sa',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

const mongoUri = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Define a schema that accommodates the form structure
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
  resume: String, // storing resume as a base64 encoded string
  jobPosition: String,
});

const ApplicationForm = mongoose.model('ApplicationForm', applicationFormSchema, 'Applicants');

// Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.OUTLOOK_EMAIL, // Your Outlook email
    pass: process.env.OUTLOOK_PASSWORD, // Your Outlook password
  },
});

// Route to handle form submission
app.post('/submit-form', upload.single('resume'), async (req, res) => {
  const { firstName, lastName, email, phone, profession, address, highestEducation, fieldOfStudy, institute, companyName, positionTitle, yearsOfExperience, skills, jobPosition } = req.body;

  let encodedFile = null;
  if (req.file) {
    const fileBuffer = await fs.promises.readFile(req.file.path);
    encodedFile = fileBuffer.toString('base64');
    await fs.promises.unlink(req.file.path); // Clean up the uploaded file after processing
  }

  const skillsFormatted = Array.isArray(skills) ? skills.join(', ') : skills;

  try {
    const applicationFormEntry = new ApplicationForm({
      firstName,
      lastName,
      email,
      phone,
      profession,
      address,
      education: highestEducation.map((educationLevel, index) => ({
        highestEducation: educationLevel,
        fieldOfStudy: fieldOfStudy[index],
        institute: institute[index],
      })),
      experience: companyName.map((company, index) => ({
        companyName: company,
        positionTitle: positionTitle[index],
        yearsOfExperience: yearsOfExperience[index],
      })),
      skills: skillsFormatted,
      resume: encodedFile,
      jobPosition,
    });

    await applicationFormEntry.save();

    // Generate the HTML table for email content
    const educationTableRows = highestEducation.map((educationLevel, index) => `
      <tr>
        <td>${educationLevel}</td>
        <td>${fieldOfStudy[index]}</td>
        <td>${institute[index]}</td>
      </tr>
    `).join('');

    const experienceTableRows = companyName.map((company, index) => `
      <tr>
        <td>${company}</td>
        <td>${positionTitle[index]}</td>
        <td>${yearsOfExperience[index]}</td>
      </tr>
    `).join('');

    const emailContent = `
      <h2>New Job Application Received</h2>
      <p><strong>Personal Information:</strong></p>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><td>First Name</td><td>${firstName}</td></tr>
        <tr><td>Last Name</td><td>${lastName}</td></tr>
        <tr><td>Email</td><td>${email}</td></tr>
        <tr><td>Phone</td><td>${phone}</td></tr>
        <tr><td>Profession</td><td>${profession}</td></tr>
        <tr><td>Address</td><td>${address}</td></tr>
        <tr><td>Skills</td><td>${skillsFormatted}</td></tr>
        <tr><td>Job Position</td><td>${jobPosition}</td></tr>
      </table>

      <p><strong>Educational Background:</strong></p>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><th>Highest Education</th><th>Field of Study</th><th>Institute</th></tr>
        ${educationTableRows}
      </table>

      <p><strong>Work Experience:</strong></p>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><th>Company Name</th><th>Title</th><th>Years of Experience</th></tr>
        ${experienceTableRows}
      </table>
    `;

    // Email options with HTML content
    const mailOptions = {
      from: process.env.OUTLOOK_EMAIL, // sender address
      to: 'info@futurecityec.com', // recipient email
      subject: `New Application for ${jobPosition} Received!`,
      html: emailContent,
      attachments: [
        {
          filename: req.file.originalname, // original file name
          content: encodedFile,
          encoding: 'base64'
        }
      ]
    };

    // Send the email notification
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('Email send error:', error);
        res.status(500).send('Failed to send email notification.');
      } else {
        console.log('Email sent: ' + info.response);
        res.send('Application submitted successfully.');
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred during form submission.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to my application!');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
