import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';

export const exportToExcel = async (data: any[], fileName: string, sheetName: string = 'Data') => {
    // 1. Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 2. Convert data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 3. Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fullFileName = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // 4. Handle Platform Specific Saving
    if (Capacitor.isNativePlatform()) {
        try {
            // Generate base64
            const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
            
            // Save to Cache directory with a unique timestamp to allow multiple downloads
            const uniqueFileName = `${new Date().getTime()}_${fullFileName}`;
            const savedFile = await Filesystem.writeFile({
                path: uniqueFileName,
                data: excelBase64,
                directory: Directory.Cache
            });

            // Open with native app
            await FileOpener.open({
                filePath: savedFile.uri,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                openWithDefault: true
            });
        } catch (error) {
            console.error('Excel Export Error:', error);
            alert('Failed to download Excel file on Android.');
        }
    } else {
        // Web platform
        XLSX.writeFile(workbook, fullFileName);
    }
};

