import { jsPDF } from 'jspdf';
import { IncidentWithDetails, AssetRequest, CCTVRequest, VehicleUsageData } from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Dialog } from '@capacitor/dialog';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';

const savePdf = async (doc: jsPDF, filename: string) => {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
        try {
            // 1. Request Runtime Storage Permissions
            const permissions = await Filesystem.requestPermissions();
            if (permissions.publicStorage !== 'granted') {
                window.alert("Storage permission denied. Cannot save PDF.");
                return;
            }

            // Optimize memory by requesting base64 directly from jsPDF
            const dataUrl = doc.output('datauristring') as string;
            const base64 = dataUrl.split(',')[1];

            // 2. Safe Saving to Documents Directory wrapped in try-catch
            const saveResult = await Filesystem.writeFile({
                path: filename,
                data: base64,
                directory: Directory.Documents,
                recursive: true
            });

            console.log('PDF saved to:', saveResult.uri);

            // Since we wrote to Documents, let the user know
            window.alert(`Success! File saved to Documents folder as "${filename}".`);

            // Try to open it if possible
            try {
                await FileOpener.open({
                    filePath: saveResult.uri,
                    contentType: 'application/pdf',
                });
            } catch (err) {
                // Ignore FileOpener errors if they don't have a PDF app installed
                console.log("Could not open PDF automatically.", err);
            }

        } catch (error: any) {
            console.error('Mobile PDF Processing Error:', error);
            // 3. Prevent total app crash via alert fallback
            window.alert(`Exception occurred while saving: ${error.message || 'Unknown error'}`);
        }
    } else {
        // iOS or Web
        doc.save(filename);
    }
};

/* --- BASE64 ASSETS START --- */
const TAGUIG_SEAL_B64 = 'data:image/png;base64,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lpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIlpIIA9fW';

const drawOfficialHeader = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const textCenterX = pageWidth / 2;

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("Republika ng Pilipinas", textCenterX, 12, { align: "center" });
    doc.text("LUNGSOD NG TAGUIG", textCenterX, 17, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("BARANGAY POST PROPER NORTHSIDE", textCenterX, 28, { align: "center" });

    doc.setFontSize(11);
    doc.text("OFFICE OF THE BANTAY BAYAN", textCenterX, 36, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.text("6 MACDA Guijo Extn., P.P. Northside, Taguig City", textCenterX, 41, { align: "center" });
    doc.text("Tel./Fax No.: 8710-6711 / 8788-1764", textCenterX, 45, { align: "center" });
    doc.text("Email: barangaypostpropernorthside@gmail.com", textCenterX, 49, { align: "center" });

    doc.setDrawColor(150, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(20, 55, pageWidth - 20, 55);
    doc.setDrawColor(0);
    return 65;
};

export const generateOfficialReport = async (incident: IncidentWithDetails) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const contentWidth = 170;
    let yPos = drawOfficialHeader(doc);

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

    doc.setFontSize(9);
    doc.setFont("times", "normal");
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
    doc.text("Case No.:", marginLeft, yPos);
    doc.setFont("times", "bold");
    doc.text(incident.case_number, marginLeft + 55, yPos, { align: "center" });
    doc.line(marginLeft + 25, yPos + 1, marginLeft + 85, yPos + 1);

    doc.setFont("times", "normal");
    doc.text("Uri (Type):", marginLeft + 90, yPos);
    doc.text(incident.type, marginLeft + 140, yPos, { align: "center" });
    doc.line(marginLeft + 115, yPos + 1, marginLeft + contentWidth, yPos + 1);

    yPos += 10;
    doc.text("Lugar (Place):", marginLeft, yPos);
    doc.text(incident.location, (marginLeft + 25 + contentWidth) / 2, yPos, { align: "center" });
    doc.line(marginLeft + 25, yPos + 1, marginLeft + contentWidth, yPos + 1);

    yPos += 15;
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
            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }
        });
    } else if (incident.case_number) {
        doc.text("Walang nakatalang sangkot (No parties recorded).", marginLeft + 5, yPos);
        yPos += 10;
    } else {
        yPos += 10;
    }

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

    if (yPos > 230) {
        doc.addPage();
        yPos = 40;
    } else {
        yPos = Math.max(yPos, 230);
    }

    doc.setFontSize(10);
    doc.text("Binuo ni (Prepared by):", marginLeft, yPos);
    yPos += 15;
    doc.setFont("times", "bold");
    doc.text((incident.officer_name || "Officer").toUpperCase(), marginLeft, yPos);
    doc.line(marginLeft, yPos + 1, marginLeft + 65, yPos + 1);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text("Desk Officer / Bantay Bayan", marginLeft, yPos + 5);

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

    doc.setFontSize(8);
    doc.setFont("times", "italic");
    doc.text("\"Patuloy na Pag-Unlad at Pagkakaisa Tungo sa Isang Matatag na Barangay\"", 105, 285, { align: "center" });

    await savePdf(doc, `Blotter_${incident.case_number || 'Blank'}.pdf`);
};

export const generateBorrowingSlip = async (request: AssetRequest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = drawOfficialHeader(doc);

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("ASSET BORROWING SLIP", pageWidth / 2, yPos + 10, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("times", "normal");
    yPos += 25;

    const marginLeft = 25;
    const lineSpacing = 12;

    doc.text(`Borrower: ${request.borrower_name}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Asset: ${request.items_requested.map(i => i.item).join(', ')}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Purpose: ${request.purpose}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Status: ${request.status.toUpperCase()}`, marginLeft, yPos);

    yPos += 30;
    doc.text("Signature over Printed Name", marginLeft, yPos);
    doc.line(marginLeft, yPos - 5, marginLeft + 60, yPos - 5);

    await savePdf(doc, `BorrowingSlip_${request.borrower_name.replace(/\s+/g, '_')}.pdf`);
};

export const generateCCTVForm = async (request: CCTVRequest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = drawOfficialHeader(doc);

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("CCTV FOOTAGE REQUEST FORM", pageWidth / 2, yPos + 10, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("times", "normal");
    yPos += 25;

    const marginLeft = 25;
    const lineSpacing = 10;

    doc.text(`Requesting Party: ${request.requester_name}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Incident Type: ${request.incident_type}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Incident Date/Time: ${request.incident_date} ${request.incident_time}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Reason: ${request.purpose}`, marginLeft, yPos);

    await savePdf(doc, `CCTV_Request_${request.requester_name.replace(/\s+/g, '_')}.pdf`);
};

export const reprintCCTVForm = async (request: any) => {
    await generateCCTVForm({
        id: request.id,
        request_number: request.request_number,
        requester_name: request.requester_name,
        incident_type: request.incident_type,
        incident_date: request.incident_date,
        incident_time: request.incident_time,
        location: request.location,
        purpose: request.purpose,
        created_at: request.created_at
    } as CCTVRequest);
};

export const generateVehicleLog = async (data: VehicleUsageData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = drawOfficialHeader(doc);

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("VEHICLE USAGE LOG", pageWidth / 2, yPos + 10, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("times", "normal");
    yPos += 25;

    const marginLeft = 25;
    const lineSpacing = 10;

    doc.text(`Driver: ${data.driver}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Passenger: ${data.passenger}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Purpose: ${data.purpose}`, marginLeft, yPos);
    yPos += lineSpacing;
    doc.text(`Departure: ${data.time_of_departure}`, marginLeft, yPos);

    await savePdf(doc, `VehicleLog_${data.driver.replace(/\s+/g, '_')}.pdf`);
};

export const generateBlankBlotter = async () => {
    const doc = new jsPDF();
    drawOfficialHeader(doc);
    await savePdf(doc, "Blank_Blotter_Form.pdf");
};

export const generateBlankBorrowing = async () => {
    const doc = new jsPDF();
    drawOfficialHeader(doc);
    await savePdf(doc, "Blank_Borrowing_Slip.pdf");
};

export const generateBlankCCTV = async () => {
    const doc = new jsPDF();
    drawOfficialHeader(doc);
    await savePdf(doc, "Blank_CCTV_Request.pdf");
};

export const generateBlankVehicleLog = async () => {
    const doc = new jsPDF();
    drawOfficialHeader(doc);
    await savePdf(doc, "Blank_Vehicle_Log.pdf");
};
