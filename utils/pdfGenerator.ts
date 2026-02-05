
import { jsPDF } from 'jspdf';
import { IncidentWithDetails, AssetRequest } from '../types';

export const generateOfficialReport = (incident: IncidentWithDetails) => {
  const doc = new jsPDF();
  const marginLeft = 20;
  const contentWidth = 170;
  let yPos = 20;

  // --- HEADER ---
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("REPUBLIC OF THE PHILIPPINES", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("CITY OF TAGUIG", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("BARANGAY POST PROPER NORTHSIDE", 105, yPos, { align: "center" });
  yPos += 5;
  doc.setFontSize(9);
  doc.text("OFFICE OF THE PUNONG BARANGAY", 105, yPos, { align: "center" });
  yPos += 15;

  // --- TITLE ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("OFFICIAL INCIDENT REPORT", 105, yPos, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(65, yPos + 2, 145, yPos + 2);
  yPos += 15;

  // --- METADATA SECTION ---
  doc.setFontSize(10);
  
  // Left Column
  doc.text("CASE NUMBER:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(incident.case_number, marginLeft + 35, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("DATE:", marginLeft + 100, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(incident.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }), marginLeft + 120, yPos);

  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.text("TYPE:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(incident.type, marginLeft + 35, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("TIME:", marginLeft + 100, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(incident.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), marginLeft + 120, yPos);

  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.text("LOCATION:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(incident.location, marginLeft + 35, yPos);

  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.text("STATUS:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(incident.status.toUpperCase(), marginLeft + 35, yPos);

  // Restricted Flag
  if (incident.is_restricted_entry) {
    doc.setTextColor(200, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("[ RESTRICTED ENTRY ]", marginLeft + 100, yPos);
    doc.setTextColor(0, 0, 0);
  }

  yPos += 10;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, yPos, marginLeft + contentWidth, yPos);
  yPos += 10;

  // --- INVOLVED PARTIES ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INVOLVED PARTIES", marginLeft, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  if (incident.parties && incident.parties.length > 0) {
      incident.parties.forEach((party) => {
          const partyInfo = `• ${party.name.toUpperCase()} (${party.role}) - ${party.age ? party.age + ' yo' : 'N/A'}`;
          doc.text(partyInfo, marginLeft + 5, yPos);
          yPos += 5;
          if (party.contact_info) {
               doc.setFontSize(9);
               doc.setTextColor(80);
               doc.text(`   Contact: ${party.contact_info}`, marginLeft + 8, yPos);
               doc.setTextColor(0);
               doc.setFontSize(10);
               yPos += 5;
          }
      });
  } else {
      doc.text("No specific parties recorded.", marginLeft + 5, yPos);
      yPos += 5;
  }
  yPos += 5;

  // --- NARRATIVE ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("NARRATIVE OF FACTS", marginLeft, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const splitNarrative = doc.splitTextToSize(incident.narrative, contentWidth);
  doc.text(splitNarrative, marginLeft, yPos);
  
  yPos += (splitNarrative.length * 5) + 20;

  // --- FOOTER ---
  // Ensure footer doesn't overflow
  if (yPos > 230) {
      doc.addPage();
      yPos = 40;
  } else {
      yPos = Math.max(yPos, 220); // Push to bottom if space allows
  }

  doc.setFontSize(10);
  
  // Left Signature
  doc.text("Prepared by:", marginLeft, yPos);
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.text((incident.officer_name || "Officer-on-Duty").toUpperCase(), marginLeft, yPos);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, yPos + 1, marginLeft + 60, yPos + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Desk Officer / Bantay Bayan", marginLeft, yPos + 5);

  // Right Signature
  yPos -= 20;
  const rightColX = 120;
  doc.setFontSize(10);
  doc.text("Noted by:", rightColX, yPos);
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.text("HON. RICHARD C. PASADILLA", rightColX, yPos);
  doc.line(rightColX, yPos + 1, rightColX + 60, yPos + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Punong Barangay", rightColX, yPos + 5);

  doc.save(`Report_${incident.case_number}.pdf`);
};

export const generateBorrowingSlip = (request: AssetRequest) => {
  const doc = new jsPDF();
  const marginLeft = 20;
  let yPos = 20;

  // --- HEADER ---
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("REPUBLIC OF THE PHILIPPINES", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("CITY OF TAGUIG", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("BARANGAY POST PROPER NORTHSIDE", 105, yPos, { align: "center" });
  yPos += 12;

  // Title Box
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(20, yPos, 170, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("BORROWER'S SLIP / REQUEST FORM", 105, yPos + 7, { align: "center" });
  doc.setTextColor(0, 0, 0); // Reset color
  yPos += 20;

  // --- DETAILS SECTION ---
  doc.setDrawColor(150);
  doc.rect(20, yPos, 170, 45); // Outer border for details

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  
  // Row 1
  doc.text("Name of Borrower:", 25, yPos + 8);
  doc.setFont("helvetica", "normal");
  doc.text(request.borrower_name.toUpperCase(), 70, yPos + 8);
  
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 140, yPos + 8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(request.created_at).toLocaleDateString(), 155, yPos + 8);

  // Row 2
  doc.setFont("helvetica", "bold");
  doc.text("Contact Number:", 25, yPos + 18);
  doc.setFont("helvetica", "normal");
  doc.text(request.contact_number, 70, yPos + 18);

  // Row 3
  doc.setFont("helvetica", "bold");
  doc.text("Address:", 25, yPos + 28);
  doc.setFont("helvetica", "normal");
  doc.text(request.address, 70, yPos + 28);

  // Row 4
  doc.setFont("helvetica", "bold");
  doc.text("Purpose:", 25, yPos + 38);
  doc.setFont("helvetica", "normal");
  doc.text(request.purpose, 70, yPos + 38);

  yPos += 55;

  // --- ITEMS TABLE ---
  doc.setFont("helvetica", "bold");
  doc.text("DETAILS OF REQUEST:", marginLeft, yPos - 5);
  
  // Table Header
  doc.setFillColor(230, 230, 230);
  doc.rect(marginLeft, yPos, 170, 8, "F");
  doc.rect(marginLeft, yPos, 170, 8, "S"); // Border
  doc.setFontSize(9);
  doc.text("ITEM DESCRIPTION", marginLeft + 5, yPos + 5);
  doc.text("QUANTITY", 150, yPos + 5);
  doc.text("REMARKS", 170, yPos + 5);
  yPos += 8;

  // Items
  doc.setFont("helvetica", "normal");
  request.items_requested.forEach((item) => {
      doc.rect(marginLeft, yPos, 170, 8, "S");
      doc.text(item.item, marginLeft + 5, yPos + 5);
      doc.text(item.quantity.toString(), 155, yPos + 5);
      yPos += 8;
  });

  // Empty rows if few items
  if (request.items_requested.length < 3) {
      for(let i=0; i < (3 - request.items_requested.length); i++) {
        doc.rect(marginLeft, yPos, 170, 8, "S");
        yPos += 8;
      }
  }

  yPos += 15;

  // --- DATES ---
  doc.setFont("helvetica", "bold");
  doc.text("SCHEDULE:", marginLeft, yPos);
  yPos += 5;
  
  doc.setLineWidth(0.1);
  doc.rect(marginLeft, yPos, 80, 15);
  doc.text("PICK-UP DATE:", marginLeft + 5, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(request.pickup_date, marginLeft + 5, yPos + 11);

  doc.rect(marginLeft + 90, yPos, 80, 15);
  doc.setFont("helvetica", "bold");
  doc.text("RETURN DATE:", marginLeft + 95, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(request.return_date, marginLeft + 95, yPos + 11);

  yPos += 25;

  // --- TERMS ---
  doc.setFontSize(8);
  doc.setFont("times", "italic");
  doc.text("TERMS AND CONDITIONS:", marginLeft, yPos);
  yPos += 5;
  const terms = "1. The borrower shall be liable for any loss or damage to the items borrowed.\n2. Items must be returned on the specified return date.\n3. A penalty may be imposed for late returns or damaged goods.";
  const splitTerms = doc.splitTextToSize(terms, 170);
  doc.text(splitTerms, marginLeft, yPos);
  
  yPos += 30;

  // --- SIGNATURES ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  // Left: Borrower
  doc.text("I acknowledge receipt of the above items:", marginLeft, yPos);
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text(request.borrower_name.toUpperCase(), marginLeft, yPos);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, yPos + 1, marginLeft + 60, yPos + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Signature of Borrower", marginLeft, yPos + 5);

  // Right: Approver
  yPos -= 15;
  const rightColX = 120;
  doc.setFontSize(10);
  doc.text("Approved & Released By:", rightColX, yPos);
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text("HON. RICHARD C. PASADILLA", rightColX, yPos);
  doc.line(rightColX, yPos + 1, rightColX + 60, yPos + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Punong Barangay / Authorized Staff", rightColX, yPos + 5);

  doc.save(`Borrowing_Slip_${request.borrower_name.replace(/\s/g, '_')}.pdf`);
};

export const generateCCTVForm = (data: any) => {
  const doc = new jsPDF();
  const marginLeft = 20;
  let yPos = 20;

  // --- HEADER ---
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("REPUBLIC OF THE PHILIPPINES", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("CITY OF TAGUIG", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("BARANGAY POST PROPER NORTHSIDE", 105, yPos, { align: "center" });
  yPos += 12;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("POST PROPER NORTHSIDE CCTV FORM", 105, yPos, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(55, yPos + 2, 155, yPos + 2);
  yPos += 15;

  // --- REQUESTER INFO ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("REQUESTER INFORMATION", marginLeft, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  // Name
  doc.text("Name:", marginLeft + 5, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.lastName.toUpperCase()}, ${data.firstName.toUpperCase()} ${data.middleInitial ? data.middleInitial.toUpperCase() + '.' : ''}`, marginLeft + 35, yPos);
  doc.line(marginLeft + 35, yPos + 1, marginLeft + 120, yPos + 1); // Underline
  
  yPos += 10;

  // Address
  doc.setFont("helvetica", "normal");
  doc.text("Address:", marginLeft + 5, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.addressNo} ${data.street}, ${data.barangay}, ${data.city}`, marginLeft + 35, yPos);
  doc.line(marginLeft + 35, yPos + 1, marginLeft + 180, yPos + 1); // Underline

  yPos += 15;

  // --- INCIDENT TYPE ---
  doc.setFont("helvetica", "bold");
  doc.text("INCIDENT TYPE", marginLeft, yPos);
  yPos += 8;

  const incidentTypes = [
      'Robbery', 'Hold-up', 'Theft', 
      'Physical Injuries', 'Vehicle Accident', 'Budol-budol',
      'Carnapping', 'Murder', 'Lost Item/s'
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // 3 columns grid
  let col = 0;
  let startY = yPos;
  
  incidentTypes.forEach((type, index) => {
      const x = marginLeft + 5 + (col * 60);
      const isChecked = data.incidentTypes.includes(type);
      
      // Checkbox
      doc.rect(x, yPos - 3, 4, 4);
      if (isChecked) {
          doc.setFontSize(8);
          doc.text("X", x + 0.8, yPos);
          doc.setFontSize(10);
      }
      
      doc.text(type, x + 6, yPos);

      col++;
      if (col > 2) {
          col = 0;
          yPos += 8;
      }
  });

  // Others Field
  if (col === 0) yPos += 0; // Already moved down
  const isOthersChecked = data.others !== '';
  doc.rect(marginLeft + 5, yPos - 3, 4, 4);
  if (isOthersChecked) {
      doc.setFontSize(8);
      doc.text("X", marginLeft + 5.8, yPos);
      doc.setFontSize(10);
  }
  doc.text("Others:", marginLeft + 11, yPos);
  doc.line(marginLeft + 25, yPos + 1, marginLeft + 100, yPos + 1);
  if(data.others) {
      doc.text(data.others, marginLeft + 27, yPos);
  }

  yPos += 15;

  // --- INCIDENT DETAILS ---
  doc.setFont("helvetica", "bold");
  doc.text("INCIDENT DETAILS", marginLeft, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  // Date & Time
  doc.text("Date of Incident:", marginLeft + 5, yPos);
  doc.text(data.dateOfIncident, marginLeft + 40, yPos);
  doc.line(marginLeft + 38, yPos + 1, marginLeft + 90, yPos + 1);

  doc.text("Time:", marginLeft + 100, yPos);
  doc.text(data.timeOfIncident, marginLeft + 115, yPos);
  doc.line(marginLeft + 112, yPos + 1, marginLeft + 160, yPos + 1);

  yPos += 10;

  // Place
  doc.text("Place of Incident:", marginLeft + 5, yPos);
  doc.text(data.placeOfIncident, marginLeft + 40, yPos);
  doc.line(marginLeft + 38, yPos + 1, marginLeft + 180, yPos + 1);

  yPos += 10;

  // Purpose
  doc.text("Purpose of Request:", marginLeft + 5, yPos);
  doc.text(data.purpose, marginLeft + 45, yPos);
  doc.line(marginLeft + 42, yPos + 1, marginLeft + 180, yPos + 1);

  yPos += 30;

  // --- FOOTER / SIGNATURES ---
  
  // Left: Requester
  doc.setFontSize(10);
  doc.text("I hereby certify that the above information is true and correct.", marginLeft, yPos - 10);
  
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text(`${data.firstName} ${data.lastName}`.toUpperCase(), marginLeft, yPos);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, yPos + 1, marginLeft + 60, yPos + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Signature of Requester", marginLeft, yPos + 5);

  // Right: Approver
  yPos += 10; 
  // Align to right but usually approvals are bottom right or centered bottom
  const rightColX = 120;
  
  doc.setFontSize(10);
  doc.text("Approved By:", rightColX, yPos - 10);
  doc.setFont("helvetica", "bold");
  doc.text("HON. RICHARD C. PASADILLA", rightColX, yPos);
  doc.line(rightColX, yPos + 1, rightColX + 60, yPos + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Punong Barangay", rightColX, yPos + 5);

  doc.save(`CCTV_Request_${data.lastName}.pdf`);
};
