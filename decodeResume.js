const fs = require('fs').promises;
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// MongoDB connection string from environment variables for security
const mongoUri = 'mongodb+srv://Irfan2k10:straight@cluster0.xuc5gvw.mongodb.net/?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Define your schema and model as per your MongoDB collection
const applicantSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  resume: String, // Base64 encoded resume string
});

const Applicant = mongoose.model('Applicant', applicantSchema, 'applicationforms'); // Use the actual name of your collection

async function saveResumeFromBase64(base64String, filePath) {
  // Function to decode Base64 and save as a file
  const base64Data = base64String.split(';base64,').pop();
  const binaryData = Buffer.from(base64Data, 'base64');
  try {
    await ensureDirectoryExists(filePath);
    await fs.writeFile(filePath, binaryData);
    console.log('File saved successfully.'); 
  } catch (error) {
    console.error('Error saving file:', error);
  }
}

async function ensureDirectoryExists(filePath) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error; // Rethrow if the error is not about the directory already existing
    }
  }
}

// Process and save resumes from MongoDB
async function processApplicantResumes() {
  try {
    const applicants = await Applicant.find({});
    for (const applicant of applicants) {
      const { firstName, lastName, resume } = applicant;
      const filePath = `./Resumes/${firstName}_${lastName}_${Date.now()}.pdf`;
      await saveResumeFromBase64(resume, filePath);
    }
  } catch (error) {
    console.error('Error processing resumes:', error);
  } finally {
    mongoose.disconnect(); // Disconnect from MongoDB after processing
  }
}

processApplicantResumes();