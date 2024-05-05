// Import necessary libraries
const { google } = require('googleapis');
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

// Path to your service account credentials JSON file
// Adjust the path as necessary, or use an environment variable
//const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii'));

// Configure JWT auth client
const { client_email, private_key } = credentials;
const auth = new google.auth.JWT(client_email, null, private_key, [
  'https://www.googleapis.com/auth/spreadsheets',
]);

// Initialize the Sheets API
const sheets = google.sheets({ version: 'v4', auth });

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
  resume: String,
});


const ApplicationForm = mongoose.model('ApplicationForm', applicationFormSchema);

// Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


function flattenEducationEntries(entries) {
  const flattened = [];
  entries.forEach(entry => {
    flattened.push(entry.highestEducation || "");
    flattened.push(entry.fieldOfStudy || "");
    flattened.push(entry.institute || "");
  });
  return flattened;
}

// Flatten Function for Experience Entries
function flattenExperienceEntries(entries) {
  const flattened = [];
  entries.forEach(entry => {
    flattened.push(entry.companyName || "");
    flattened.push(entry.positionTitle || "");
    flattened.push(entry.yearsOfExperience || "");
  });
  return flattened;
}

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
  const { firstName, lastName, email, phone, profession, address, highestEducation, fieldOfStudy, institute, companyName, positionTitle, yearsOfExperience, skills } = req.body;

  let encodedFile = null;
  if (req.file) {
    const fileBuffer = await fs.promises.readFile(req.file.path);
    encodedFile = fileBuffer.toString('base64');
    await fs.promises.unlink(req.file.path); // Clean up the uploaded file after processing
  }

  const skillsFormatted = Array.isArray(skills) ? skills.join(', ') : skills;

  // Define educationEntries and experienceEntries before using them
  const educationEntries = highestEducation.map((educationLevel, index) => ({
    highestEducation: educationLevel,
    fieldOfStudy: fieldOfStudy[index],
    institute: institute[index],
  }));

  const experienceEntries = companyName.map((company, index) => ({
    companyName: company,
    positionTitle: positionTitle[index],
    yearsOfExperience: yearsOfExperience[index],
  }));

  try {
    const applicationFormEntry = new ApplicationForm({
      firstName,
      lastName,
      email,
      phone,
      profession,
      address,
      education: educationEntries,
      experience: experienceEntries,
      skills: skillsFormatted,
      resume: encodedFile,
    });

    await applicationFormEntry.save();
    
    // Prepare data for Google Sheets
    const rowData = [
      [
        firstName, lastName, email, phone, profession, address,
        ...flattenEducationEntries(educationEntries),
        ...flattenExperienceEntries(experienceEntries),
        skillsFormatted
      ],
    ];
    
    const request = {
      spreadsheetId: '1Rx7MQNJ262ohizPM2Wqw2wTsAOoD7oKWoaE-zrtvpG4',
      range: 'Sheet1!A:M',
      valueInputOption: 'RAW',
      resource: { values: rowData },
    };

    await sheets.spreadsheets.values.append(request);

    const mailOptions = {
      from: process.env.OUTLOOK_EMAIL, // sender address
      to: 'irfan.ishtiaq@futurecityec.com', // replace with your email
      subject: 'New Form Submission Notification', // Updated subject line
      text: `A new form has been submitted. Please check the spreadsheet for details: https://docs.google.com/spreadsheets/d/1Rx7MQNJ262ohizPM2Wqw2wTsAOoD7oKWoaE-zrtvpG4`, // Link to the spreadsheet with your specific ID
    };
    

    // Send the email notification
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('Email send error:', error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.send('Application submitted successfully.');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred.');
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
