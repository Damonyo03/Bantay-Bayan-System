const fs = require('fs');
const path = require('path');

const src = 'c:/Users/user/Downloads/Projects/Bantay-Bayan-System/old_pdf_2.ts';
try {
    console.log('Reading file...');
    const content = fs.readFileSync(src, 'utf8');
    console.log('File read, size:', content.length);

    const taguigMatch = content.match(/const TAGUIG_SEAL_B64 = '([^']*)'/);
    if (taguigMatch) {
        fs.writeFileSync('c:/Users/user/Downloads/Projects/Bantay-Bayan-System/taguig_seal.txt', taguigMatch[1]);
        console.log('Taguig seal extracted');
    } else {
        console.log('Taguig seal NOT found');
    }

    const brgyMatch = content.match(/const BRGY_SEAL_B64 = '([^']*)'/);
    if (brgyMatch) {
        fs.writeFileSync('c:/Users/user/Downloads/Projects/Bantay-Bayan-System/brgy_seal.txt', brgyMatch[1]);
        console.log('Brgy seal extracted');
    } else {
        console.log('Brgy seal NOT found');
    }
} catch (e) {
    console.error('Error occurred:', e);
}
