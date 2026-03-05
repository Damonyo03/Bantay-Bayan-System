const fs = require('fs');
const path = require('path');

const projectDir = 'c:\\Users\\user\\Downloads\\Projects\\Bantay-Bayan-System';
const pdfGeneratorPath = path.join(projectDir, 'utils', 'pdfGenerator.ts');
const taguigSealPath = path.join(projectDir, 'taguig_seal_plain.txt');
const brgySealPath = path.join(projectDir, 'brgy_seal_plain.txt');

// Read the plain base64 strings
const taguigSeal = fs.readFileSync(taguigSealPath, 'utf8').trim();
const brgySeal = fs.readFileSync(brgySealPath, 'utf8').trim();

// The new drawOfficialHeader function (from old_pdf_2.ts with 22pt font adjustment)
const drawOfficialHeader = `const drawOfficialHeader = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Repositioned Logos: Taguig (Left), Barangay (Right)
    const logoY = 10;
    const logoSize = 30; // Increased logo size slightly to match larger text

    // Left Logo: Taguig City
    doc.addImage(TAGUIG_SEAL_B64, 'PNG', 20, logoY, logoSize, logoSize);

    // Right Logo: Barangay Northside
    doc.addImage(BRGY_SEAL_B64, 'PNG', pageWidth - 50, logoY, logoSize, logoSize);

    // Header Text - Perfectly Centered
    const textCenterX = pageWidth / 2;

    doc.setFont("times", "normal");
    doc.setFontSize(14); // Standard heading size (14pt)
    doc.text("Republika ng Pilipinas", textCenterX, 15, { align: "center" });
    doc.text("LUNGSOD NG TAGUIG", textCenterX, 22, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(22); // Reduced from 24pt to 22pt as requested
    doc.text("BARANGAY POST PROPER NORTHSIDE", textCenterX, 34, { align: "center" });

    doc.setFontSize(18); // Smaller than Barangay but larger than contact (18pt)
    doc.text("OFFICE OF THE BANTAY BAYAN", textCenterX, 45, { align: "center" });

    doc.setFontSize(11); // Standard body size (11pt)
    doc.setFont("times", "normal");
    doc.text("6 MACDA Guijo Extn., P.P. Northside, Taguig City", textCenterX, 52, { align: "center" });
    doc.text("Tel./Fax No.: 8710-6711 / 8788-1764", textCenterX, 57, { align: "center" });
    doc.text("Email: barangaypostpropernorthside@gmail.com", textCenterX, 62, { align: "center" });

    doc.setDrawColor(150, 0, 0); // Maroon/Dark Red line
    doc.setLineWidth(1); // Slightly thicker line
    doc.line(20, 68, pageWidth - 20, 68);
    doc.setDrawColor(0); // Reset

    return 78; // Increased return yPos to prevent overlap
};`;

// Report generation functions (adapted from old_pdf_2.ts with mobile save logic)
const generateOfficialReport = `export const generateOfficialReport = async (incident: IncidentWithDetails) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const contentWidth = 170;
    let yPos = drawOfficialHeader(doc);

    // --- FORM TITLE ---
    doc.setFont("times", "bold");
    if (incident.is_restricted_entry) {
        doc.setFontSize(16);
        doc.text("BARANGAY BLOTTER FORM", pageWidth / 2, yPos + 10, { align: "center" });
        doc.setFontSize(14);
        doc.text("(RESTRICTED)", pageWidth / 2, yPos + 20, { align: "center" });
        yPos += 35;
    } else {
        doc.setFontSize(16);
        doc.text("BARANGAY BLOTTER FORM", pageWidth / 2, yPos + 10, { align: "center" });
        yPos += 25;
    }

    // --- CASE DETAILS ---
    doc.setFontSize(9);
    doc.setFont("times", "normal");

    // Date and Time Row
    doc.text("Petsa (Date):", marginLeft, yPos);
    doc.line(marginLeft + 25, yPos + 1, marginLeft + 85, yPos + 1);
    if (incident.case_number) {
        const dateStr = new Date(incident.created_at).toLocaleDateString();
        doc.text(dateStr, marginLeft + 55, yPos, { align: "center" });
    }

    doc.text("Oras (Time):", marginLeft + 90, yPos);
    doc.line(marginLeft + 115, yPos + 1, marginLeft + contentWidth, yPos + 1);
    if (incident.case_number) {
        const timeStr = new Date(incident.created_at).toLocaleTimeString();
        doc.text(timeStr, marginLeft + 140, yPos, { align: "center" });
    }

    yPos += 10;

    // Case Number and Type Row
    doc.text("Case No.:", marginLeft, yPos);
    doc.setFont("times", "bold");
    doc.text(incident.case_number, marginLeft + 55, yPos, { align: "center" });
    doc.line(marginLeft + 25, yPos + 1, marginLeft + 85, yPos + 1);

    doc.setFont("times", "normal");
    doc.text("Uri (Type):", marginLeft + 90, yPos);
    doc.text(incident.type, marginLeft + 140, yPos, { align: "center" });
    doc.line(marginLeft + 115, yPos + 1, marginLeft + contentWidth, yPos + 1);

    yPos += 10;

    // Location
    doc.text("Lugar (Place):", marginLeft, yPos);
    doc.text(incident.location, (marginLeft + 25 + contentWidth) / 2, yPos, { align: "center" });
    doc.line(marginLeft + 25, yPos + 1, marginLeft + contentWidth, yPos + 1);

    yPos += 15;

    // --- INVOLVED PARTIES ---
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text("INVOLVED PARTIES (MGA SANGKOT):", marginLeft, yPos);
    yPos += 7;

    if (incident.parties && incident.parties.length > 0) {
        incident.parties.forEach((party) => {
            doc.setFontSize(10);
            doc.setFont("times", "bold");
            doc.text(\`\${party.name.toUpperCase()}\`, marginLeft + 5, yPos);
            doc.setFont("times", "normal");
            doc.text(\`(\${party.role}) - \${party.age} yo\`, marginLeft + 75, yPos);

            if (party.contact_info) {
                doc.text(\`   Contact: \${party.contact_info}\`, marginLeft + 5, yPos + 5);
            }

            yPos += 12;

            // Page break check
            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }
        });
    } else if (incident.case_number) {
        doc.text("Walang nakatalang sangkot (No parties recorded).", marginLeft + 5, yPos);
        yPos += 10;
    } else {
        yPos += 10; // Keep space even if blank
    }

    // --- NARRATIVE SECTION ---
    yPos += 5;
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text("SALAYSAY NG PANGYAYARI (NARRATIVE):", marginLeft, yPos);
    yPos += 7;

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    const splitNarrative = doc.splitTextToSize(incident.narrative || "", contentWidth);
    doc.text(splitNarrative, marginLeft, yPos);

    yPos += (splitNarrative.length * 5) + 20;

    // --- FOOTER ---
    if (yPos > 230) {
        doc.addPage();
        yPos = 40;
    } else {
        yPos = Math.max(yPos, 230);
    }

    doc.setFontSize(10);

    // Left: Preparer
    doc.text("Binuo ni (Prepared by):", marginLeft, yPos);
    yPos += 15;
    doc.setFont("times", "bold");
    doc.text((incident.officer_name || "Officer").toUpperCase(), marginLeft, yPos);
    doc.line(marginLeft, yPos + 1, marginLeft + 65, yPos + 1);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text("Desk Officer / Bantay Bayan", marginLeft, yPos + 5);

    // Right: Punong Barangay
    yPos -= 15;
    const rightSigX = pageWidth - 80;
    doc.setFontSize(10);
    doc.text("Pinatunayan ni (Noted by):", rightSigX, yPos);
    yPos += 15;
    doc.setFont("times", "bold");
    doc.text("HON. RICHARD C. PASADILLA", rightSigX, yPos);
    doc.line(rightSigX, yPos + 1, pageWidth - 20, yPos + 1);
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text("Punong Barangay", rightSigX + 5, yPos + 5);

    // --- PHILOSOPHY FOOTER ---
    doc.setFontSize(8);
    doc.setFont("times", "italic");
    doc.text("\\"Patuloy na Pag-Unlad at Pagkakaisa Tungo sa Isang Matatag na Barangay\\"", 105, 285, { align: "center" });

    await savePdf(doc, \`Blotter_\${incident.case_number || 'Blank'}.pdf\`);
};`;

const generateBorrowingSlip = `export const generateBorrowingSlip = async (request: AssetRequest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const contentWidth = 170;
    let yPos = drawOfficialHeader(doc);

    // --- TITLE ---
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("BORROWER'S SLIP / REQUEST FORM", pageWidth / 2, yPos + 10, { align: "center" });
    yPos += 20;

    // --- DETAILS SECTION ---
    doc.setFontSize(10);
    doc.setFont("times", "normal");

    // Name and Date Row
    doc.text("Name of Borrower:", marginLeft, yPos);
    doc.line(marginLeft + 30, yPos + 1, marginLeft + 100, yPos + 1);
    doc.setFont("times", "bold");
    doc.text(request.borrower_name.toUpperCase(), marginLeft + 65, yPos, { align: "center" });

    doc.setFont("times", "normal");
    doc.text("Date:", marginLeft + 110, yPos);
    doc.line(marginLeft + 120, yPos + 1, pageWidth - 20, yPos + 1);
    const today = request.borrower_name === "" ? "" : new Date().toLocaleDateString();
    doc.text(today, marginLeft + 155, yPos, { align: "center" });
    yPos += 10;

    // Contact and Address
    doc.text("Contact Number:", marginLeft, yPos);
    doc.line(marginLeft + 28, yPos + 1, marginLeft + 85, yPos + 1);
    doc.text(request.contact_number, marginLeft + 56, yPos, { align: "center" });

    doc.text("Address:", marginLeft + 90, yPos);
    doc.line(marginLeft + 105, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(request.address, (marginLeft + 105 + pageWidth - 20) / 2, yPos, { align: "center" });
    yPos += 10;

    // Purpose
    doc.text("Purpose of Borrowing:", marginLeft, yPos);
    doc.line(marginLeft + 35, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(request.purpose, (marginLeft + 35 + pageWidth - 20) / 2, yPos, { align: "center" });
    yPos += 15;

    // --- ITEMS TABLE ---
    doc.setFont("times", "bold");
    doc.text("DETAILS OF REQUESTED ITEMS:", marginLeft, yPos);
    yPos += 5;

    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(marginLeft, yPos, contentWidth, 8, "F");
    doc.rect(marginLeft, yPos, contentWidth, 8, "S");
    doc.setFontSize(9);
    doc.text("ITEM DESCRIPTION", marginLeft + 5, yPos + 5);
    doc.text("QTY", marginLeft + 140, yPos + 5);
    yPos += 8;

    // Items
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    request.items_requested.forEach((item) => {
        doc.rect(marginLeft, yPos, contentWidth, 8, "S");
        doc.text(item.item, marginLeft + 5, yPos + 5);
        doc.text(item.quantity.toString(), marginLeft + 142, yPos + 5);
        yPos += 8;
    });

    // Empty rows if few items
    if (request.items_requested.length < 3) {
        for (let i = 0; i < (3 - request.items_requested.length); i++) {
            doc.rect(marginLeft, yPos, contentWidth, 8, "S");
            yPos += 8;
        }
    }

    yPos += 15;

    // --- SCHEDULE ---
    doc.setFont("times", "bold");
    doc.text("SCHEDULE OF USE:", marginLeft, yPos);
    yPos += 5;

    doc.setLineWidth(0.1);
    doc.rect(marginLeft, yPos, 80, 15);
    doc.text("PICK-UP DATE:", marginLeft + 5, yPos + 5);
    doc.setFont("times", "normal");
    doc.text(request.pickup_date, marginLeft + 5, yPos + 11);

    doc.rect(marginLeft + 90, yPos, 80, 15);
    doc.setFont("times", "bold");
    doc.text("RETURN DATE:", marginLeft + 95, yPos + 5);
    doc.setFont("times", "normal");
    doc.text(request.return_date, marginLeft + 95, yPos + 11);

    yPos += 25;

    // --- TERMS ---
    doc.setFontSize(8);
    doc.setFont("times", "italic");
    doc.text("TERMS AND CONDITIONS:", marginLeft, yPos);
    yPos += 5;
    const terms = "1. The borrower shall be liable for any loss or damage to the items borrowed. 2. Items must be returned on the specified return date. 3. A penalty may be imposed for late returns or damaged goods.";
    const splitTerms = doc.splitTextToSize(terms, contentWidth);
    doc.text(splitTerms, marginLeft, yPos);

    yPos += 20;

    // --- SIGNATURES ---
    doc.setFont("times", "normal");
    doc.setFontSize(10);

    doc.text("Acknowledge by (Borrower):", marginLeft, yPos);
    doc.text("Approved & Released by:", pageWidth - 80, yPos);
    yPos += 15;

    doc.setFont("times", "bold");
    doc.text(request.borrower_name.toUpperCase(), marginLeft + 32, yPos, { align: "center" });
    doc.line(marginLeft, yPos + 1, marginLeft + 65, yPos + 1);

    const rightSigX = pageWidth - 80;
    doc.setFont("times", "bold");
    doc.text("HON. RICHARD C. PASADILLA", rightSigX + 30, yPos, { align: "center" });
    doc.line(rightSigX, yPos + 1, pageWidth - 20, yPos + 1);

    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text("Signature over Printed Name", marginLeft + 10, yPos + 5);
    doc.text("Punong Barangay", rightSigX + 5, yPos + 5);

    await savePdf(doc, \`Borrowing_Slip_\${request.borrower_name.replace(/\\s+/g, '_')}.pdf\`);
};`;

const generateCCTVForm = `export const generateCCTVForm = async (request: CCTVRequest) => {
    const doc = new jsPDF();
    const marginLeft = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = 170;
    let yPos = drawOfficialHeader(doc);

    // --- TITLE ---
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("CCTV REQUEST FORM", pageWidth / 2, yPos + 10, { align: "center" });
    yPos += 18;

    doc.setFontSize(8);
    doc.setFont("times", "normal");
    const subText = "Please complete this form, providing as much information as possible. The more information you supply, the easier it will be for us to fulfill your request.";
    const splitSubText = doc.splitTextToSize(subText, contentWidth);
    doc.text(splitSubText, pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // --- DATA FIELDS ---
    doc.setFontSize(10);

    // Date Row
    doc.text("Date:", marginLeft, yPos);
    doc.line(marginLeft + 12, yPos + 1, marginLeft + 60, yPos + 1);
    const dateStr = request.request_number ? new Date().toLocaleDateString() : "";
    doc.text(dateStr, marginLeft + 36, yPos, { align: "center" });
    yPos += 10;

    // Name Row
    doc.text("Name:", marginLeft, yPos);
    doc.line(marginLeft + 12, yPos + 1, pageWidth - 20, yPos + 1);
    doc.setFont("times", "bold");
    doc.text(request.requester_name.toUpperCase(), marginLeft + 15, yPos);
    doc.setFont("times", "normal");
    yPos += 12;

    // Address
    doc.text("Address:", marginLeft, yPos);
    doc.line(marginLeft + 15, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(request.location || "", marginLeft + 18, yPos);
    yPos += 12;

    // Incident Details
    doc.text("Incident Type:", marginLeft, yPos);
    doc.line(marginLeft + 25, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(request.incident_type || "", marginLeft + 27, yPos);
    yPos += 12;

    doc.text("Date of Incident:", marginLeft, yPos);
    doc.line(marginLeft + 30, yPos + 1, marginLeft + 90, yPos + 1);
    doc.text(request.incident_date || "", marginLeft + 60, yPos, { align: "center" });

    doc.text("Time of Incident:", marginLeft + 95, yPos);
    doc.line(marginLeft + 125, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(request.incident_time || "", (marginLeft + 125 + pageWidth - 20) / 2, yPos, { align: "center" });

    yPos += 12;

    doc.text("Purpose:", marginLeft, yPos);
    doc.line(marginLeft + 18, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(request.purpose || "", (marginLeft + 18 + pageWidth - 20) / 2, yPos, { align: "center" });
    yPos += 20;

    // Certify text
    doc.setFontSize(8);
    const certify = "I hereby certify that the above information (personal information, time, date and place) is true and correct.";
    doc.text(certify, marginLeft, yPos);
    yPos += 15;

    // Signatures
    doc.setFontSize(10);
    doc.text("Approved by:", pageWidth - 80, yPos);
    yPos += 15;

    const sigLine = 60;
    doc.line(marginLeft, yPos + 1, marginLeft + sigLine, yPos + 1);
    doc.setFontSize(8);
    doc.text("Requester's Signature", marginLeft + 12, yPos + 5);

    const rightSigX = pageWidth - 80;
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text("HON. RICHARD C. PASADILLA", rightSigX, yPos);
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text("Punong Barangay", rightSigX + 5, yPos + 4);

    await savePdf(doc, \`CCTV_Request_\${request.requester_name || 'Request'}.pdf\`);
};`;

const reprintCCTVForm = `export const reprintCCTVForm = async (request: any) => {
    // Reuse generateCCTVForm logic
    await generateCCTVForm(request);
};`;

const generateVehicleLog = `export const generateVehicleLog = async (data: VehicleUsageData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    let yPos = drawOfficialHeader(doc);

    // --- TITLE ---
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("VEHICLE USAGE LOG FORM", pageWidth / 2, yPos + 10, { align: "center" });
    yPos += 25;

    // --- DATA FIELDS ---
    doc.setFontSize(12);
    doc.setFont("times", "normal");

    const drawField = (label, value, currentY) => {
        doc.setFont("times", "bold");
        doc.text(label, marginLeft, currentY);
        doc.setFont("times", "normal");

        // Calculate center of the line
        const lineStart = marginLeft + 48;
        const lineEnd = pageWidth - 20;
        const centerX = (lineStart + lineEnd) / 2;

        doc.text(value || "", centerX, currentY, { align: "center" });
        doc.line(lineStart, currentY + 1, lineEnd, currentY + 1);
        return currentY + 15;
    };

    yPos = drawField("Date:", new Date().toLocaleDateString(), yPos);
    yPos = drawField("Time of Departure:", data.time_of_departure, yPos);
    yPos = drawField("Time of Arrival:", data.time_of_arrival, yPos);
    yPos = drawField("Driver:", data.driver ? data.driver.toUpperCase() : "", yPos);
    yPos = drawField("Passenger(s):", data.passenger, yPos);
    yPos = drawField("Purpose:", data.purpose, yPos);

    yPos += 20;

    // --- SIGNATURES ---
    doc.setFontSize(10);
    doc.text("Driver's Signature:", marginLeft, yPos);
    doc.line(marginLeft + 35, yPos + 1, marginLeft + 90, yPos + 1);

    doc.text("In-Charge Signature:", pageWidth - 80, yPos);
    doc.line(pageWidth - 80 + 35, yPos + 1, pageWidth - 20, yPos + 1);

    await savePdf(doc, \`Vehicle_Log_\${new Date().getTime()}.pdf\`);
};`;

// Also update simple blank forms
const generateBlankBlotter = `export const generateBlankBlotter = async () => {
    const blankIncident = {
        case_number: "",
        created_at: new Date().toISOString(),
        location: "",
        type: "",
        narrative: "",
        parties: [],
        officer_name: "",
        is_restricted_entry: false
    };
    await generateOfficialReport(blankIncident as any);
};`;

const generateBlankBorrowing = `export const generateBlankBorrowing = async () => {
    const blankRequest = {
        borrower_name: "",
        items_requested: [],
        purpose: "",
        pickup_date: "",
        return_date: "",
        contact_number: "",
        address: "",
        status: 'pending'
    };
    await generateBorrowingSlip(blankRequest as any);
};`;

const generateBlankCCTV = `export const generateBlankCCTV = async () => {
    const blankRequest = {
        requester_name: "",
        incident_type: "",
        incident_date: "",
        incident_time: "",
        location: "",
        purpose: "",
        request_number: ""
    };
    await generateCCTVForm(blankRequest as any);
};`;

const generateBlankVehicleLog = `export const generateBlankVehicleLog = async () => {
    const blankData = {
        driver: "",
        passenger: "",
        purpose: "",
        time_of_departure: "",
        time_of_arrival: ""
    } as VehicleUsageData;
    await generateVehicleLog(blankData);
};`;

// Patch the file
let content = fs.readFileSync(pdfGeneratorPath, 'utf8');

// Restore seals
content = content.replace(/const TAGUIG_SEAL_B64 = '[^']*';/, "const TAGUIG_SEAL_B64 = '" + taguigSeal + "';");
// Note: If BRGY_SEAL_B64 doesn't exist, we need to add it.
if (!content.includes('const BRGY_SEAL_B64')) {
    content = content.replace(/(const TAGUIG_SEAL_B64 = '[^']*';)/, "$1\\nconst BRGY_SEAL_B64 = '" + brgySeal + "';");
} else {
    content = content.replace(/const BRGY_SEAL_B64 = '[^']*';/, "const BRGY_SEAL_B64 = '" + brgySeal + "';");
}

// Replace header
content = content.replace(/const drawOfficialHeader = \\(doc: jsPDF\\) => \\{[\\s\\S]*?\\n\\};/, drawOfficialHeader);

// Replace report functions
content = content.replace(/export const generateOfficialReport = async \\(incident: IncidentWithDetails\\) => \\{[\\s\\S]*?\\n\\};/, generateOfficialReport);
content = content.replace(/export const generateBorrowingSlip = async \\(request: AssetRequest\\) => \\{[\\s\\S]*?\\n\\};/, generateBorrowingSlip);
content = content.replace(/export const generateCCTVForm = async \\(request: CCTVRequest\\) => \\{[\\s\\S]*?\\n\\};/, generateCCTVForm);
content = content.replace(/export const reprintCCTVForm = async \\(request: any\\) => \\{[\\s\\S]*?\\n\\};/, reprintCCTVForm);
content = content.replace(/export const generateVehicleLog = async \\(data: VehicleUsageData\\) => \\{[\\s\\S]*?\\n\\};/, generateVehicleLog);
content = content.replace(/export const generateBlankBlotter = async \\(\\) => \\{[\\s\\S]*?\\n\\};/, generateBlankBlotter);
content = content.replace(/export const generateBlankBorrowing = async \\(\\) => \\{[\\s\\S]*?\\n\\};/, generateBlankBorrowing);
content = content.replace(/export const generateBlankCCTV = async \\(\\) => \\{[\\s\\S]*?\\n\\};/, generateBlankCCTV);
content = content.replace(/export const generateBlankVehicleLog = async \\(\\) => \\{[\\s\\S]*?\\n\\};/, generateBlankVehicleLog);

fs.writeFileSync(pdfGeneratorPath, content);
console.log('Successfully reverted PDF layout and adjusted font size.');
