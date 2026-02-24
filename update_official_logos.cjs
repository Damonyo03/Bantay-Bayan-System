const fs = require('fs');
const path = require('path');

const taguigPath = 'c:/Users/user/Downloads/City_of_Taguig_LOGO.png';
const ppNorthsidePath = 'c:/Users/user/Downloads/Post_Proper_Northside_Logo.png';
const pdfGenPath = 'c:/Users/user/Downloads/Projects/Bantay-Bayan-System/utils/pdfGenerator.ts';

function toBase64(filePath) {
    const file = fs.readFileSync(filePath);
    return `data:image/png;base64,${file.toString('base64')}`;
}

try {
    const taguigB64 = toBase64(taguigPath);
    const ppNorthsideB64 = toBase64(ppNorthsidePath);

    let content = fs.readFileSync(pdfGenPath, 'utf8');

    // Update TAGUIG_SEAL_B64
    content = content.replace(/const TAGUIG_SEAL_B64 = '.*';/, `const TAGUIG_SEAL_B64 = '${taguigB64}';`);

    // Update BRGY_SEAL_B64
    content = content.replace(/const BRGY_SEAL_B64 = '.*';/, `const BRGY_SEAL_B64 = '${ppNorthsideB64}';`);

    fs.writeFileSync(pdfGenPath, content);
    console.log('Successfully updated logos in pdfGenerator.ts');
} catch (err) {
    console.error('Error updating logos:', err);
    process.exit(1);
}
