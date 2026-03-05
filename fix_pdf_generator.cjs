const fs = require('fs');
const path = require('path');

const oldPdfPath = path.join(__dirname, 'old_pdf_2.ts');
const currentPdfPath = path.join(__dirname, 'utils', 'pdfGenerator.ts');

const oldContent = fs.readFileSync(oldPdfPath, 'utf8');
const currentContent = fs.readFileSync(currentPdfPath, 'utf8');

// 1. Extract base64 strings from old content
const taguigMatch = oldContent.match(/const TAGUIG_SEAL_B64 = '(.*?)';/);
const brgyMatch = oldContent.match(/const BRGY_SEAL_B64 = '(.*?)';/);

if (!taguigMatch || !brgyMatch) {
    console.error('Failed to extract base64 from old_pdf_2.ts');
    process.exit(1);
}

const TAGUIG_SEAL_B64 = taguigMatch[1];
const BRGY_SEAL_B64 = brgyMatch[1];

// 2. Extract savePdf (mobile version) from current content
// We look for where savePdf starts until the end of the file or next major export
// The mobile version usually uses Capacitor/Filesystem
const savePdfStart = currentContent.indexOf('const savePdf = async');
const savePdfEnd = currentContent.indexOf('export const generateOfficialReport', savePdfStart);
const savePdfContent = currentContent.substring(savePdfStart, savePdfEnd !== -1 ? savePdfEnd : currentContent.length).trim();

// 3. Extract the rest of the functions from old content
// Everything from drawOfficialHeader onwards
const headerIndex = oldContent.indexOf('const drawOfficialHeader');
let restOfContent = oldContent.substring(headerIndex);

// Apply the font size adjustment: 24pt -> 22pt
restOfContent = restOfContent.replace('doc.setFontSize(24); // Largest text (24pt)', 'doc.setFontSize(22); // Largest text (22pt)');

// 4. Reconstruct the file
const newContent = `
import { jsPDF } from 'jspdf';
import { IncidentWithDetails, AssetRequest, CCTVRequest, VehicleUsageData } from '../types';

const TAGUIG_SEAL_B64 = '${TAGUIG_SEAL_B64}';
const BRGY_SEAL_B64 = '${BRGY_SEAL_B64}';

${savePdfContent}

${restOfContent}
`.trim();

fs.writeFileSync(currentPdfPath, newContent);
console.log('Successfully reconstructed utils/pdfGenerator.ts');
