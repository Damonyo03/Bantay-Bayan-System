import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';
import { LogbookEntry } from '../types';
import { branding } from '../src/config/branding';
import { logbookService } from './logbookService';

const getCaptainName = () => {
  return branding.executive.find((m) => m.isPrimary)?.name || 'HON. PUNONG BARANGAY';
};

/**
 * Renders the official Barangay / LGU header matching system standard
 */
const drawOfficialHeader = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoY = 10;
  const logoSize = 25;

  // Left Logo: City / Primary Seal
  if (branding.primarySealUrl && branding.primarySealUrl.trim() !== '') {
    try {
      doc.addImage(branding.primarySealUrl, 'PNG', 18, logoY, logoSize, logoSize);
    } catch {
      // Safe fallback
    }
  }

  // Right Logo: Barangay / Secondary Seal
  if (branding.secondarySealUrl && branding.secondarySealUrl.trim() !== '') {
    try {
      doc.addImage(branding.secondarySealUrl, 'PNG', pageWidth - 43, logoY, logoSize, logoSize);
    } catch {
      // Safe fallback
    }
  }

  const textCenterX = pageWidth / 2;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('Republika ng Pilipinas', textCenterX, 12, { align: 'center' });
  if (branding.cityName) {
    doc.text(branding.cityName.toUpperCase(), textCenterX, 16, { align: 'center' });
  }

  // Primary Organization Name
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.text(branding.orgName.toUpperCase(), textCenterX, 24, { align: 'center' });

  // Subtitle
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICE OF THE BANTAY BAYAN', textCenterX, 30, { align: 'center' });

  // Address
  doc.setFontSize(8.5);
  doc.setFont('times', 'normal');
  if (branding.emergency.address) {
    doc.text(branding.emergency.address, textCenterX, 36, { align: 'center' });
  }

  // Maroon divider
  doc.setDrawColor(150, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(18, 48, pageWidth - 18, 48);
  doc.setDrawColor(0);

  return 56;
};

/**
 * Saves or prints the generated PDF (Capacitor native or Web download/print)
 */
const saveOrPrintPdf = async (
  doc: jsPDF,
  fileName: string,
  mode: 'download' | 'print' = 'print'
) => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Filesystem.checkPermissions();
        if (permissions.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (permError) {
        console.warn('Storage permission check skipped/failed:', permError);
      }

      const pdfOutput = doc.output('datauristring');
      const base64Data = pdfOutput.split(',')[1];

      // Native print bridge
      if (mode === 'print' && (window as any).AndroidBlobDownloader?.printBlob) {
        (window as any).AndroidBlobDownloader.printBlob(base64Data, fileName.replace('.pdf', ''));
        return;
      }

      // Native download bridge
      if (mode === 'download' && (window as any).AndroidBlobDownloader?.downloadBlob) {
        (window as any).AndroidBlobDownloader.downloadBlob(base64Data, fileName);
        return;
      }

      // Fallback to Filesystem + FileOpener
      const uniqueFileName = `${new Date().getTime()}_${fileName}`;
      const savedFile = await Filesystem.writeFile({
        path: uniqueFileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      await FileOpener.open({
        filePath: savedFile.uri,
        contentType: 'application/pdf',
        openWithDefault: true,
      });
    } else {
      // Browser platform
      if (mode === 'print') {
        const blobUrl = doc.output('bloburl');
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save(fileName);
        }
      } else {
        doc.save(fileName);
      }
    }
  } catch (err: any) {
    console.error('Error saving/printing PDF:', err);
    throw err;
  }
};

/**
 * Log export / print action to Logbook
 */
const logExportAction = async (actionType: 'pdf' | 'csv' | 'print_daily', title: string, details: any) => {
  try {
    await logbookService.createManualEntry({
      category: 'other',
      action: actionType,
      title,
      description: `Automated audit log: ${title}. Parameters: ${JSON.stringify(details)}`,
    });
  } catch (err) {
    console.warn('Failed to audit log export action:', err);
  }
};

export interface ExportPdfOptions {
  dateStart: string;
  dateEnd?: string;
  entries: LogbookEntry[];
  officerName?: string;
  mode?: 'download' | 'print';
}

export const logbookExportService = {
  /**
   * Export Printable Daily Operations Logbook (with Official Signatures and Seals)
   */
  generateDailyLogPdf: async (options: ExportPdfOptions): Promise<void> => {
    const { dateStart, entries, officerName, mode = 'print' } = options;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 18;
    const contentWidth = pageWidth - marginLeft * 2;

    let yPos = drawOfficialHeader(doc);

    // Document Title
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAILY OPERATIONS LOGBOOK', pageWidth / 2, yPos + 6, { align: 'center' });

    // Date Banner
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    const formattedDate = new Date(`${dateStart}T12:00:00`).toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Official Ledger for: ${formattedDate}`, pageWidth / 2, yPos + 12, { align: 'center' });
    doc.setFontSize(8.5);
    doc.text(`Total Recorded Entries: ${entries.length}`, pageWidth / 2, yPos + 17, { align: 'center' });

    yPos += 24;

    // Table Header
    const drawTableHeader = (startY: number) => {
      doc.setFillColor(240, 243, 246);
      doc.rect(marginLeft, startY, contentWidth, 7, 'F');
      doc.rect(marginLeft, startY, contentWidth, 7, 'S');

      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.text('TIME', marginLeft + 2, startY + 4.8);
      doc.text('CAT / REF', marginLeft + 22, startY + 4.8);
      doc.text('OPERATION DETAILS / NARRATIVE', marginLeft + 56, startY + 4.8);
      doc.text('DUTY OFFICER', marginLeft + contentWidth - 32, startY + 4.8);
      return startY + 7;
    };

    yPos = drawTableHeader(yPos);

    // Sort entries chronologically ascending for daily review
    const sorted = [...entries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    doc.setFont('times', 'normal');
    doc.setFontSize(8);

    if (sorted.length === 0) {
      doc.rect(marginLeft, yPos, contentWidth, 12, 'S');
      doc.text('Walang nakatalang operasyon (No recorded entries for this date).', marginLeft + 5, yPos + 7);
      yPos += 12;
    } else {
      for (const entry of sorted) {
        const timeStr = new Date(entry.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const catStr = entry.category.toUpperCase();
        const refStr = entry.reference_id ? `\n#${String(entry.reference_id).slice(0, 8)}` : '';
        const officer = entry.reporter_name || 'System / Officer';

        // Narrative splitting
        const narrativeFull = `${entry.title}${entry.description ? ' — ' + entry.description : ''}`;
        const narrativeLines = doc.splitTextToSize(narrativeFull, contentWidth - 92);
        const rowHeight = Math.max(8, narrativeLines.length * 4 + 4);

        // Check page overflow
        if (yPos + rowHeight > pageHeight - 45) {
          doc.addPage();
          yPos = drawOfficialHeader(doc);
          yPos = drawTableHeader(yPos + 5);
        }

        // Draw row border
        doc.rect(marginLeft, yPos, contentWidth, rowHeight, 'S');

        // Draw row contents
        doc.setFont('times', 'bold');
        doc.text(timeStr, marginLeft + 2, yPos + 4.5);

        doc.setFont('times', 'normal');
        doc.setFontSize(7.5);
        doc.text(`${catStr}${refStr}`, marginLeft + 22, yPos + 4.5);

        doc.setFontSize(8);
        doc.text(narrativeLines, marginLeft + 56, yPos + 4.5);

        doc.text(doc.splitTextToSize(officer, 30), marginLeft + contentWidth - 32, yPos + 4.5);

        yPos += rowHeight;
      }
    }

    // Signature Block Section
    if (yPos > pageHeight - 45) {
      doc.addPage();
      yPos = 35;
    } else {
      yPos = Math.max(yPos + 10, pageHeight - 45);
    }

    doc.setFontSize(9);
    doc.setFont('times', 'normal');

    // Left Signature: Desk Officer
    doc.text('Prepared / Submitted by:', marginLeft, yPos);
    yPos += 13;
    doc.setFont('times', 'bold');
    doc.text((officerName || 'DUTY DESK OFFICER').toUpperCase(), marginLeft, yPos);
    doc.line(marginLeft, yPos + 1, marginLeft + 65, yPos + 1);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.text('Duty Desk Officer / Bantay Bayan', marginLeft, yPos + 4.5);

    // Right Signature: Punong Barangay
    yPos -= 13;
    const rightSigX = pageWidth - 80;
    doc.setFontSize(9);
    doc.text('Noted / Certified by:', rightSigX, yPos);
    yPos += 13;
    doc.setFont('times', 'bold');
    doc.text(getCaptainName(), rightSigX, yPos);
    doc.line(rightSigX, yPos + 1, pageWidth - marginLeft, yPos + 1);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.text('Punong Barangay', rightSigX + 5, yPos + 4.5);

    // Page Numbering & Motto Footer on all pages
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont('times', 'italic');
      doc.text(
        '"Patuloy na Pag-Unlad at Pagkakaisa Tungo sa Isang Matatag na Barangay"',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.setFont('times', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginLeft, pageHeight - 10, {
        align: 'right',
      });
    }

    const fileName = `Daily_Logbook_${dateStart}.pdf`;
    await saveOrPrintPdf(doc, fileName, mode);

    // Auto audit log
    await logExportAction('print_daily', `Printed Daily Operations Logbook (${dateStart})`, {
      date: dateStart,
      entries_count: entries.length,
      officer: officerName,
    });
  },

  /**
   * Export General Logbook PDF for a Date Range
   */
  exportDateRangePdf: async (options: ExportPdfOptions): Promise<void> => {
    const { dateStart, dateEnd = dateStart, entries, officerName, mode = 'download' } = options;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 18;
    const contentWidth = pageWidth - marginLeft * 2;

    let yPos = drawOfficialHeader(doc);

    // Title
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text('BARANGAY OPERATIONS ACTIVITY REPORT', pageWidth / 2, yPos + 6, { align: 'center' });

    // Date Range Summary
    doc.setFontSize(9.5);
    doc.setFont('times', 'normal');
    const rangeText =
      dateStart === dateEnd
        ? `Coverage Date: ${dateStart}`
        : `Coverage Period: ${dateStart} to ${dateEnd}`;
    doc.text(rangeText, pageWidth / 2, yPos + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Total Records: ${entries.length}`, pageWidth / 2, yPos + 16, { align: 'center' });

    yPos += 22;

    // Table Header
    const drawTableHeader = (startY: number) => {
      doc.setFillColor(240, 243, 246);
      doc.rect(marginLeft, startY, contentWidth, 7, 'F');
      doc.rect(marginLeft, startY, contentWidth, 7, 'S');

      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text('DATE & TIME', marginLeft + 2, startY + 4.8);
      doc.text('CATEGORY', marginLeft + 32, startY + 4.8);
      doc.text('ACTIVITY / TITLE & SUMMARY', marginLeft + 62, startY + 4.8);
      doc.text('OFFICER', marginLeft + contentWidth - 30, startY + 4.8);
      return startY + 7;
    };

    yPos = drawTableHeader(yPos);

    // Sort entries chronologically
    const sorted = [...entries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    doc.setFont('times', 'normal');
    doc.setFontSize(8);

    if (sorted.length === 0) {
      doc.rect(marginLeft, yPos, contentWidth, 12, 'S');
      doc.text('Walang nakatalang tala sa panahong ito (No records found).', marginLeft + 5, yPos + 7);
      yPos += 12;
    } else {
      for (const entry of sorted) {
        const d = new Date(entry.created_at);
        const dtStr = `${d.toLocaleDateString('en-PH', { month: 'numeric', day: 'numeric', year: '2-digit' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        const catStr = entry.category.toUpperCase();
        const officer = entry.reporter_name || 'Staff';

        const narrative = `${entry.title}${entry.description ? ' — ' + entry.description : ''}`;
        const narrativeLines = doc.splitTextToSize(narrative, contentWidth - 95);
        const rowHeight = Math.max(8, narrativeLines.length * 4 + 4);

        if (yPos + rowHeight > pageHeight - 35) {
          doc.addPage();
          yPos = drawOfficialHeader(doc);
          yPos = drawTableHeader(yPos + 5);
        }

        doc.rect(marginLeft, yPos, contentWidth, rowHeight, 'S');
        doc.text(dtStr, marginLeft + 2, yPos + 4.5);
        doc.text(catStr, marginLeft + 32, yPos + 4.5);
        doc.text(narrativeLines, marginLeft + 62, yPos + 4.5);
        doc.text(doc.splitTextToSize(officer, 28), marginLeft + contentWidth - 30, yPos + 4.5);

        yPos += rowHeight;
      }
    }

    // Bottom Signatures
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 35;
    } else {
      yPos = Math.max(yPos + 8, pageHeight - 40);
    }

    doc.setFontSize(8.5);
    doc.text('Generated by:', marginLeft, yPos);
    yPos += 12;
    doc.setFont('times', 'bold');
    doc.text((officerName || 'DESK OFFICER').toUpperCase(), marginLeft, yPos);
    doc.line(marginLeft, yPos + 1, marginLeft + 60, yPos + 1);

    const rightSigX = pageWidth - 80;
    yPos -= 12;
    doc.setFont('times', 'normal');
    doc.text('Attested by:', rightSigX, yPos);
    yPos += 12;
    doc.setFont('times', 'bold');
    doc.text(getCaptainName(), rightSigX, yPos);
    doc.line(rightSigX, yPos + 1, pageWidth - marginLeft, yPos + 1);

    // Page Numbering
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont('times', 'italic');
      doc.text(
        '"Patuloy na Pag-Unlad at Pagkakaisa Tungo sa Isang Matatag na Barangay"',
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
      doc.setFont('times', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginLeft, pageHeight - 8, {
        align: 'right',
      });
    }

    const fileName = `Logbook_Export_${dateStart}_to_${dateEnd}.pdf`;
    await saveOrPrintPdf(doc, fileName, mode);

    // Auto audit log
    await logExportAction('pdf', `Exported Logbook PDF (${dateStart} to ${dateEnd})`, {
      date_start: dateStart,
      date_end: dateEnd,
      records_count: entries.length,
    });
  },

  /**
   * Export Logbook Data to CSV
   */
  exportCsv: async (options: {
    dateStart: string;
    dateEnd?: string;
    entries: LogbookEntry[];
  }): Promise<void> => {
    const { dateStart, dateEnd = dateStart, entries } = options;

    const headers = [
      'Timestamp (ISO)',
      'Date',
      'Time',
      'Category',
      'Action',
      'Title',
      'Description / Narrative',
      'Reported By',
      'Reporter Role',
      'Reference Type',
      'Reference ID',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = entries.map((e) => {
      const d = new Date(e.created_at);
      const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const timeStr = d.toLocaleTimeString('en-GB'); // HH:MM:SS
      return [
        escapeCsv(e.created_at),
        escapeCsv(dateStr),
        escapeCsv(timeStr),
        escapeCsv(e.category),
        escapeCsv(e.action),
        escapeCsv(e.title),
        escapeCsv(e.description),
        escapeCsv(e.reporter_name),
        escapeCsv(e.reporter_role),
        escapeCsv(e.reference_type || ''),
        escapeCsv(e.reference_id || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const fileName = `Logbook_Data_${dateStart}_to_${dateEnd}.csv`;

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
        if ((window as any).AndroidBlobDownloader?.downloadBlob) {
          (window as any).AndroidBlobDownloader.downloadBlob(base64Data, fileName);
        } else {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
        }
      } catch (err) {
        console.error('Failed to save native CSV:', err);
      }
    } else {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Auto audit log
    await logExportAction('csv', `Exported Logbook CSV (${dateStart} to ${dateEnd})`, {
      date_start: dateStart,
      date_end: dateEnd,
      records_count: entries.length,
    });
  },
};
