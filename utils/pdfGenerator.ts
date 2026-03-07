import { jsPDF } from 'jspdf';
import { IncidentWithDetails, AssetRequest, CCTVRequest, VehicleUsageData } from '../types';

const TAGUIG_SEAL_B64 = '/taguig_seal.png';
const BRGY_SEAL_B64 = '/brgy_seal.png';

const drawOfficialHeader = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Repositioned Logos: Taguig (Left), Barangay (Right)
    const logoY = 10;
    const logoSize = 25;

    // Left Logo: Taguig City
    doc.addImage(TAGUIG_SEAL_B64, 'PNG', 20, logoY, logoSize, logoSize);

    // Right Logo: Barangay Northside
    doc.addImage(BRGY_SEAL_B64, 'PNG', pageWidth - 45, logoY, logoSize, logoSize);

    // Header Text - Perfectly Centered between margins/logos
    const textCenterX = pageWidth / 2;

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("Republika ng Pilipinas", textCenterX, 12, { align: "center" });
    doc.text("LUNGSOD NG TAGUIG", textCenterX, 17, { align: "center" });

    // Primary Focal Point: Barangay Name
    // Increased to size 22 using Times Bold (Serif), no logo overlap
    doc.setFont("times", "bold"); // Reverted to Serif Bold
    doc.setFontSize(22);
    doc.text("BARANGAY POST PROPER NORTHSIDE", textCenterX, 30, { align: "center" });

    // Subtitle: Office of the Bantay Bayan
    // Set to Times Bold, size 14 as per visual reference
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("OFFICE OF THE BANTAY BAYAN", textCenterX, 40, { align: "center" });

    // Address and Contact Details - Maintained small and readable
    doc.setFontSize(9);
    doc.setFont("times", "normal");
    doc.text("6 MACDA Guijo Extn., P.P. Northside, Taguig City", textCenterX, 48, { align: "center" });
    doc.text("Tel./Fax No.: 8710-6711 / 8788-1764", textCenterX, 53, { align: "center" });
    doc.text("Email: barangaypostpropernorthside@gmail.com", textCenterX, 58, { align: "center" });

    doc.setDrawColor(150, 0, 0); // Maroon/Dark Red line
    doc.setLineWidth(0.8);
    doc.line(20, 64, pageWidth - 20, 64);
    doc.setDrawColor(0); // Reset

    return 70; // Maintain return yPos for content starting point
};

export const generateOfficialReport = (incident: IncidentWithDetails) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const contentWidth = 170;
    let yPos = drawOfficialHeader(doc);

    // --- FORM TITLE ---
    doc.setFont("times", "bold");
    if (incident.is_restricted_entry) {
        doc.setFontSize(16);
        doc.text("BARANGAY BLOTTER FORM", pageWidth / 2, yPos + 8, { align: "center" });
        doc.setFontSize(14);
        doc.text("(RESTRICTED)", pageWidth / 2, yPos + 18, { align: "center" });
        yPos += 28;
    } else {
        doc.setFontSize(16);
        doc.text("BARANGAY BLOTTER FORM", pageWidth / 2, yPos + 10, { align: "center" });
        yPos += 20;
    }

    // --- CASE INFO GRID ---
    doc.setFontSize(9);
    doc.setFont("times", "normal");

    // Date and Time Row
    doc.text("Petsa (Date):", marginLeft, yPos);
    doc.line(marginLeft + 25, yPos + 1, marginLeft + 85, yPos + 1);
    if (incident.case_number) {
        const dateStr = new Date(incident.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
        doc.text(dateStr, marginLeft + 55, yPos, { align: "center" });
    }

    doc.text("Oras (Time):", marginLeft + 90, yPos);
    doc.line(marginLeft + 115, yPos + 1, marginLeft + contentWidth, yPos + 1);
    if (incident.case_number) {
        const timeStr = new Date(incident.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        doc.text(timeStr, marginLeft + 140, yPos, { align: "center" });
    }

    yPos += 10;

    // Case Number
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
            doc.text(`${party.name.toUpperCase()}`, marginLeft + 5, yPos);
            doc.setFont("times", "normal");
            doc.text(`(${party.role}) - ${party.age} yo`, marginLeft + 75, yPos);

            if (party.contact_info) {
                doc.text(`   Contact: ${party.contact_info}`, marginLeft + 5, yPos + 5);
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
    const splitNarrative = doc.splitTextToSize(incident.narrative, contentWidth);
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
    doc.text("\"Patuloy na Pag-Unlad at Pagkakaisa Tungo sa Isang Matatag na Barangay\"", 105, 285, { align: "center" });

    doc.save(`Blotter_${incident.case_number}.pdf`);
};

export const generateBorrowingSlip = (request: AssetRequest) => {
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

    doc.save(`Borrowing_Slip_${request.borrower_name.replace(/\s/g, '_')}.pdf`);
};

export const generateCCTVForm = (data: any) => {
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
    const dateStr = data.request_number ? new Date().toLocaleDateString() : "";
    doc.text(dateStr, marginLeft + 36, yPos, { align: "center" });
    yPos += 10;

    // Name Row with sub-labels
    doc.text("Name:", marginLeft, yPos);
    doc.line(marginLeft + 12, yPos + 1, pageWidth - 20, yPos + 1);
    const nameX = marginLeft + 12;
    const cellWidth = (pageWidth - 20 - nameX) / 3;

    doc.text(data.lastName.toUpperCase(), nameX + cellWidth / 2, yPos, { align: "center" });
    doc.line(nameX, yPos + 1, nameX + cellWidth - 2, yPos + 1);

    doc.text(data.firstName.toUpperCase(), nameX + cellWidth + cellWidth / 2, yPos, { align: "center" });
    doc.line(nameX + cellWidth, yPos + 1, nameX + (cellWidth * 2) - 2, yPos + 1);

    doc.text(data.middleInitial ? data.middleInitial.toUpperCase() : "", nameX + (cellWidth * 2) + cellWidth / 2, yPos, { align: "center" });
    doc.line(nameX + (cellWidth * 2), yPos + 1, pageWidth - 20, yPos + 1);

    doc.setFontSize(7);
    doc.setFont("times", "italic");
    doc.text("(Last Name)", nameX + 5, yPos + 4);
    doc.text("(First Name)", nameX + 55, yPos + 4);
    doc.text("(Middle Initial)", nameX + 105, yPos + 4);
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    yPos += 12;

    // Address Row with sub-labels
    doc.text("Address:", marginLeft, yPos);
    doc.line(marginLeft + 15, yPos + 1, pageWidth - 20, yPos + 1);
    const addrX = marginLeft + 15;
    const addrCellWidth = (pageWidth - 20 - addrX) / 4;

    doc.text(data.addressNo, addrX + addrCellWidth / 2, yPos, { align: "center" });
    doc.text(data.street, addrX + addrCellWidth + addrCellWidth / 2, yPos, { align: "center" });
    doc.text(data.barangay, addrX + (addrCellWidth * 2) + addrCellWidth / 2, yPos, { align: "center" });
    doc.text(data.city, addrX + (addrCellWidth * 3) + addrCellWidth / 2, yPos, { align: "center" });

    doc.line(addrX, yPos + 1, addrX + addrCellWidth - 2, yPos + 1);
    doc.line(addrX + addrCellWidth, yPos + 1, addrX + (addrCellWidth * 2) - 2, yPos + 1);
    doc.line(addrX + (addrCellWidth * 2), yPos + 1, addrX + (addrCellWidth * 3) - 2, yPos + 1);
    doc.line(addrX + (addrCellWidth * 3), yPos + 1, pageWidth - 20, yPos + 1);

    doc.setFontSize(7);
    doc.setFont("times", "italic");
    doc.text("(No.)", marginLeft + 18, yPos + 4);
    doc.text("(Street)", marginLeft + 35, yPos + 4);
    doc.text("(Barangay)", marginLeft + 80, yPos + 4);
    doc.text("(City)", marginLeft + 125, yPos + 4);
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    yPos += 12;

    // Case/Incident Types
    doc.text("Case:", marginLeft, yPos);
    const incidentTypes = ['Robbery', 'Hold-up', 'Theft', 'Physical Injuries', 'Vehicle Accident', 'Budol-budol', 'Carnapping', 'Murder', 'Lost Item/s'];

    let col = 0;
    let typeY = yPos;
    incidentTypes.forEach((type) => {
        const x = marginLeft + 15 + (col * 55);
        const isChecked = data.incidentTypes.includes(type);

        doc.rect(x, typeY - 3, 3.5, 3.5);
        if (isChecked) {
            doc.setFontSize(8);
            doc.text("X", x + 0.8, typeY - 0.2);
            doc.setFontSize(10);
        }
        doc.text(type, x + 6, typeY);

        col++;
        if (col > 2) { col = 0; typeY += 6; }
    });

    yPos = typeY + 8;

    // Others
    doc.text("Others:", marginLeft + 15, yPos);
    doc.line(marginLeft + 28, yPos + 1, marginLeft + 120, yPos + 1);
    if (data.others) doc.text(data.others, marginLeft + 74, yPos, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("times", "italic");
    doc.text("(Please specify)", marginLeft + 30, yPos + 4);
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    yPos += 12;

    // Incident Details with lines
    const detailFields = [
        { label: "Date of Incident:", value: data.dateOfIncident, width: 60 },
        { label: "Time of Incident:", value: data.timeOfIncident, width: 60 }
    ];

    doc.text(detailFields[0].label, marginLeft, yPos);
    doc.line(marginLeft + 30, yPos + 1, marginLeft + 90, yPos + 1);
    doc.text(detailFields[0].value, marginLeft + 60, yPos, { align: "center" });

    doc.text(detailFields[1].label, marginLeft + 95, yPos);
    doc.line(marginLeft + 125, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(detailFields[1].value, (marginLeft + 125 + pageWidth - 20) / 2, yPos, { align: "center" });

    yPos += 10;

    doc.text("Place of Incident:", marginLeft, yPos);
    doc.line(marginLeft + 30, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(data.placeOfIncident, (marginLeft + 30 + pageWidth - 20) / 2, yPos, { align: "center" });
    yPos += 10;

    doc.text("Purpose:", marginLeft, yPos);
    doc.line(marginLeft + 18, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(data.purpose, (marginLeft + 18 + pageWidth - 20) / 2, yPos, { align: "center" });
    yPos += 12;

    doc.text("Remarks/Comments (to be filled by the operator):", marginLeft, yPos);
    yPos += 2;
    doc.line(marginLeft, yPos + 8, pageWidth - 20, yPos + 8);
    doc.line(marginLeft, yPos + 16, pageWidth - 20, yPos + 16);
    yPos += 25;

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

    doc.save(`CCTV_Request_${data.lastName}.pdf`);
};

export const reprintCCTVForm = (data: CCTVRequest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const contentWidth = 170;
    let yPos = drawOfficialHeader(doc);

    // --- TITLE ---
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("CCTV REQUEST FORM (REPRINT)", pageWidth / 2, yPos + 10, { align: "center" });
    yPos += 20;

    // --- DATA FIELDS ---
    doc.setFontSize(10);
    doc.setFont("times", "normal");

    doc.text("Name:", marginLeft, yPos);
    doc.line(marginLeft + 12, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(data.requester_name.toUpperCase(), marginLeft + 15, yPos);
    yPos += 12;

    doc.text("Address:", marginLeft, yPos);
    doc.line(marginLeft + 15, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(data.location, marginLeft + 18, yPos); // Note: location is used for address here for CCTVReprints
    yPos += 15;

    // Incident Type
    doc.text("Incident Type:", marginLeft, yPos);
    doc.line(marginLeft + 25, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(data.incident_type, marginLeft + 27, yPos);
    yPos += 12;

    // Details
    doc.text("Date:", marginLeft, yPos);
    doc.line(marginLeft + 12, yPos + 1, marginLeft + 85, yPos + 1);
    doc.text(data.incident_date, marginLeft + 15, yPos);

    doc.text("Time:", marginLeft + 90, yPos);
    doc.line(marginLeft + 102, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(data.incident_time, marginLeft + 105, yPos);
    yPos += 12;

    doc.text("Purpose:", marginLeft, yPos);
    doc.line(marginLeft + 18, yPos + 1, pageWidth - 20, yPos + 1);
    doc.text(data.purpose, marginLeft + 20, yPos);
    yPos += 20;

    // Signatures
    doc.text("Approved by:", pageWidth - 80, yPos);
    yPos += 20;

    const rightSigX = pageWidth - 80;
    doc.setFont("times", "bold");
    doc.text("HON. RICHARD C. PASADILLA", rightSigX, yPos);
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text("Punong Barangay", rightSigX + 5, yPos + 4);

    doc.save(`CCTV_Reprint_${data.request_number}.pdf`);
};

export const generateVehicleLog = (data: VehicleUsageData) => {
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

    const drawField = (label: string, value: string, currentY: number) => {
        doc.setFont("times", "bold");
        doc.text(label, marginLeft, currentY);
        doc.setFont("times", "normal");

        // Calculate center of the line
        const lineStart = marginLeft + 48;
        const lineEnd = pageWidth - 20;
        const centerX = (lineStart + lineEnd) / 2;

        doc.text(value, centerX, currentY, { align: "center" });
        doc.line(lineStart, currentY + 1, lineEnd, currentY + 1);
        return currentY + 15;
    };

    yPos = drawField("Date:", new Date().toLocaleDateString(), yPos);
    yPos = drawField("Time of Departure:", data.time_of_departure, yPos);
    yPos = drawField("Time of Arrival:", data.time_of_arrival, yPos);
    yPos = drawField("Driver:", data.driver.toUpperCase(), yPos);
    yPos = drawField("Passenger(s):", data.passenger, yPos);
    yPos = drawField("Purpose:", data.purpose, yPos);

    yPos += 20;

    // --- SIGNATURES ---
    doc.setFontSize(10);
    doc.text("Driver's Signature:", marginLeft, yPos);
    doc.line(marginLeft + 35, yPos + 1, marginLeft + 90, yPos + 1);

    doc.text("In-Charge Signature:", pageWidth - 80, yPos);
    doc.line(pageWidth - 80 + 35, yPos + 1, pageWidth - 20, yPos + 1);

    doc.save(`Vehicle_Log_${new Date().getTime()}.pdf`);
};

export const generateBlankBlotter = () => {
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
    generateOfficialReport(blankIncident as any);
};

export const generateBlankBorrowingSlip = () => {
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
    generateBorrowingSlip(blankRequest as any);
};

export const generateBlankCCTVRequest = () => {
    const blankData = {
        lastName: "",
        firstName: "",
        middleInitial: "",
        addressNo: "",
        street: "",
        barangay: "",
        city: "",
        incidentTypes: [],
        others: "",
        dateOfIncident: "",
        timeOfIncident: "",
        placeOfIncident: "",
        purpose: "",
        request_number: ""
    };
    generateCCTVForm(blankData);
};

export const generateBlankVehicleLog = () => {
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

    const drawBlankField = (label: string, currentY: number) => {
        doc.setFont("times", "bold");
        doc.text(label, marginLeft, currentY);
        doc.line(marginLeft + 48, currentY + 1, pageWidth - 20, currentY + 1);
        return currentY + 15;
    };

    yPos = drawBlankField("Date:", yPos);
    yPos = drawBlankField("Time of Departure:", yPos);
    yPos = drawBlankField("Time of Arrival:", yPos);
    yPos = drawBlankField("Driver:", yPos);
    yPos = drawBlankField("Passenger(s):", yPos);
    yPos = drawBlankField("Purpose:", yPos);

    yPos += 20;

    // --- SIGNATURES ---
    doc.setFontSize(10);
    doc.text("Driver's Signature:", marginLeft, yPos);
    doc.line(marginLeft + 35, yPos + 1, marginLeft + 90, yPos + 1);

    doc.text("In-Charge Signature:", pageWidth - 80, yPos);
    doc.line(pageWidth - 80 + 35, yPos + 1, pageWidth - 20, yPos + 1);

    doc.save("Vehicle_Usage_Log_Blank.pdf");
};
