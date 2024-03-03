/*

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Convert credentials from base64 to a JavaScript object
const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii'));

// Configure the Google auth client
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/drive']
);

// Initialize Google Drive API service
const drive = google.drive({ version: 'v3', auth });

async function uploadFile(filePath, folderId) {
    try {
        const fileMetadata = {
            name: path.basename(filePath),
            parents: [folderId],
        };
        const media = {
            mimeType: 'application/pdf',
            body: fs.createReadStream(filePath),
        };
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        console.log('Uploaded file ID:', response.data.id);
        return response.data.webViewLink;
    } catch (error) {
        console.error('Error uploading file:', error.message);
        throw error;
    }
}

module.exports = uploadFile;
// Example usage (replace 'path/to/resume.pdf' with the actual path and 'folderId' with actual folder ID)
// uploadFile('path/to/resume.pdf', '15jUHgsCKxQMkXsLCLvebd3_8QBhSOOFc').then(data => console.log(data));
*/