// Import necessary libraries
const nodemailer = require('nodemailer');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

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

// Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Email transporter setup
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
  // Extracting text fields; file is handled separately by Multer
  const { firstName, lastName, email, phone, address, highestEducation, fieldOfStudy, institute, companyName, positionTitle, yearsOfExperience, skills } = req.body;

  let encodedFile = null, resumeFilePath = '';
  if (req.file) {
    const fileBuffer = fs.readFileSync(req.file.path);
    encodedFile = fileBuffer.toString('base64');
    resumeFilePath = req.file.path; // Use the temporary file path for email attachment
    // fs.unlinkSync(req.file.path); // Don't immediately clean up; we'll send it as an attachment
  }

  const educationFormatted = highestEducation.map((educationLevel, index) => {
    return `${educationLevel}, ${fieldOfStudy[index]}, ${institute[index]}`;
  }).join('; ');

  const experienceFormatted = companyName.map((company, index) => {
    return `${company}, ${positionTitle[index]}, ${yearsOfExperience[index]} years`;
  }).join('; ');

  const applicationFormEntry = new ApplicationForm({
    firstName,
    lastName,
    email,
    phone,
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
    skills: Array.isArray(skills) ? skills : [skills], // Ensure skills is always an array
    resume: encodedFile,
  });

  try {
    await applicationFormEntry.save();

    // Sending email notification
    const mailOptions = {
      from: process.env.OUTLOOK_EMAIL, // sender address
      to: 'irfan.ishtiaq@futurecityec.com', // replace with your email
      subject: 'New Form Submission Received', // Subject line
      text: `A new form has been submitted. Details:\n\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}\nAddress: ${address}\nEducation: ${educationFormatted}\nExperience: ${experienceFormatted}\nSkills: ${skills.join(', ')}`, // Customize as needed
      attachments: [
        {
          filename: 'resume.pdf', // or '.docx' etc. depending on the file type
          path: resumeFilePath // Path to the file
        }
      ]
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('Email send error:', error);
      } else {
        console.log('Email sent: ' + info.response);
      }
      // Cleanup the uploaded file after sending the email
      if(resumeFilePath) fs.unlinkSync(resumeFilePath);
    });

    res.send('Application submitted successfully.');
  } catch (error) {
    console.error('Save to MongoDB failed:', error);
    res.status(500).send('An error occurred.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
