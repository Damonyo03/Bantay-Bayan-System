import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Data') => {
    // 1. Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 2. Convert data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 3. Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 4. Generate the excel file and trigger download
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
