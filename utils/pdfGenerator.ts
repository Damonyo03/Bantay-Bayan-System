
import { jsPDF } from 'jspdf';
import { IncidentWithDetails, AssetRequest } from '../types';

export const generateOfficialReport = (incident: IncidentWithDetails) => {
  const doc = new jsPDF();
  const marginLeft = 20;
  let yPos = 20;

  // Header - Official Format
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("REPUBLIC OF THE PHILIPPINES", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("Province of Rizal", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("Municipality of Cainta", 105, yPos, { align: "center" });
  yPos += 5;
  doc.setFontSize(12);
  doc.text("BARANGAY POST PROPER NORTHSIDE", 105, yPos, { align: "center" });
  yPos += 15;

  doc.setFontSize(16);
  doc.text("OFFICIAL INCIDENT RECORD", 105, yPos, { align: "center" });
  yPos += 10;

  // Divider
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  // Incident Meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`CASE NO: ${incident.case_number}`, 150, yPos);
  doc.text(`DATE: ${new Date(incident.created_at).toLocaleDateString()}`, marginLeft, yPos);
  yPos += 6;
  doc.text(`TIME: ${new Date(incident.created_at).toLocaleTimeString()}`, marginLeft, yPos);
  yPos += 6;
  doc.text(`LOCATION: ${incident.location}`, marginLeft, yPos);
  yPos += 6;
  doc.text(`CATEGORY: ${incident.type}`, marginLeft, yPos);
  yPos += 6;
  doc.text(`REPORTING OFFICER: ${incident.officer_name || incident.officer_id}`, marginLeft, yPos);
  
  // Restricted Flag
  if (incident.is_restricted_entry) {
      yPos += 10;
      doc.setTextColor(220, 38, 38); // Red
      doc.setFontSize(14);
      doc.text("*** RESTRICTED ENTRY / PERSONA NON GRATA FLAGGED ***", 105, yPos, { align: "center" });
      doc.setTextColor(0, 0, 0); // Reset
      doc.setFontSize(11);
  }

  yPos += 15;

  // Narrative
  doc.setFont("helvetica", "bold");
  doc.text("NARRATIVE OF FACTS (Salaysay ng Pangyayari):", marginLeft, yPos);
  yPos += 8;
  doc.setFont("helvetica", "normal");
  const splitText = doc.splitTextToSize(incident.narrative, 170);
  doc.text(splitText, marginLeft, yPos);
  yPos += (splitText.length * 6) + 10;

  // Parties
  if (incident.parties && incident.parties.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("INVOLVED PARTIES:", marginLeft, yPos);
    yPos += 8;
    
    incident.parties.forEach((party, index) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${party.name}`, marginLeft + 5, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`   Role: ${party.role} | Age: ${party.age}`, marginLeft + 5, yPos + 5);
      
      const stmt = `   Statement: "${party.statement}"`;
      const splitStmt = doc.splitTextToSize(stmt, 160);
      doc.text(splitStmt, marginLeft + 5, yPos + 11);
      
      yPos += (splitStmt.length * 6) + 16;
    });
  }

  // Footer / Signature
  yPos = 240; 
  
  doc.setFont("helvetica", "normal");
  doc.text("Prepared by:", marginLeft, yPos);
  doc.text("Noted by:", 120, yPos);
  
  yPos += 20;
  
  // Officer Signature
  doc.setFont("helvetica", "bold");
  doc.text(incident.officer_name || "Authorized Officer", marginLeft, yPos);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, yPos - 1, marginLeft + 60, yPos - 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Bantay Bayan Officer / Desk Officer", marginLeft, yPos + 4);

  // Chairman Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HON. RICHARD C. PASADILLA", 120, yPos);
  doc.line(120, yPos - 1, 190, yPos - 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Punong Barangay", 120, yPos + 4);

  // Save
  doc.save(`Official_Record_${incident.case_number}.pdf`);
};

export const generateBorrowingSlip = (request: AssetRequest) => {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 190;
  let yPos = 20;

  // --- HEADER ---
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("REPUBLIC OF THE PHILIPPINES", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("Municipality of Cainta", 105, yPos, { align: "center" });
  yPos += 5;
  doc.setFontSize(11);
  doc.text("BARANGAY POST PROPER NORTHSIDE", 105, yPos, { align: "center" });
  yPos += 12;

  // Box for Title
  doc.setFillColor(50, 50, 50);
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

  yPos += 10;

  // --- DATES ---
  doc.setFont("helvetica", "bold");
  doc.text("SCHEDULE:", marginLeft, yPos);
  yPos += 5;
  
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
  doc.setFontSize(10);
  doc.text("Approved & Released By:", 120, yPos);
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text("HON. RICHARD C. PASADILLA", 120, yPos);
  doc.line(120, yPos + 1, 180, yPos + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Punong Barangay / Authorized Staff", 120, yPos + 5);

  doc.save(`Borrowing_Slip_${request.borrower_name.replace(/\s/g, '_')}.pdf`);
}
