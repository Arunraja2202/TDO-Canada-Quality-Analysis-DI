/**
 * src/excel.js
 *
 * Generates Excel report with:
 * - Error Summary sheet
 * - Hyperlinks to each sheet
 * - Header styling
 * - Auto column sizing
 */

'use strict';

const ExcelJS = require('exceljs');
const path = require('path');

/**
 * @param {Object} resultDict
 * @param {string} outputDir
 * @returns {Promise<string>}
 */
async function createExcel(resultDict, outputDir) {

    const timestamp = new Date()
        .toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '')
        .slice(0,17);

    const filename =
        `DI-Error-Report-${timestamp}.xlsx`;

    const filepath =
        path.join(outputDir, filename);

    const workbook =
        new ExcelJS.Workbook();

    workbook.creator = 'TDO Quality Analysis';

    // ======================================================
    // Create Summary Sheet
    // ======================================================

    const summarySheet =
        workbook.addWorksheet('Error Summary');

    summarySheet.columns = [
        {
            header:'Sheet Name',
            key:'sheet',
            width:40
        },
        {
            header:'Error Count',
            key:'count',
            width:20
        },
        {
            header:'Navigation',
            key:'nav',
            width:25
        }
    ];

    // Header style
    summarySheet.getRow(1).font = {
        bold:true,
        color:{argb:'FFFFFF'}
    };

    summarySheet.getRow(1).fill = {
        type:'pattern',
        pattern:'solid',
        fgColor:{argb:'FF0000'}
    };

    summarySheet.getRow(1).alignment = {
        horizontal:'center'
    };

    let summaryRowNo=2;

    // ======================================================
    // Detail sheets
    // ======================================================

    for(const [sheetName,data]
        of Object.entries(resultDict)) {

        if(sheetName==='Error Summary')
            continue;

        const safeSheetName =
            safeName(sheetName);

        const ws =
            workbook.addWorksheet(
                safeSheetName
            );

        // No data
        if(
            !Array.isArray(data)
            || data.length===0
        ){

            ws.addRow(['No errors found']);

        } else {

            const headers =
                Object.keys(data[0]);

            ws.columns =
                headers.map(h=>({
                    header:h,
                    key:h,
                    width:25
                }));

            data.forEach(row=>{
                ws.addRow(row);
            });

            // Header style
            ws.getRow(1).font={
                bold:true,
                color:{argb:'FFFFFF'}
            };

            ws.getRow(1).fill={
                type:'pattern',
                pattern:'solid',
                fgColor:{argb:'FF0000'}
            };

            ws.getRow(1).alignment={
                horizontal:'center'
            };

            // Auto width
            ws.columns.forEach(column=>{

                let maxLength=15;

                column.eachCell(
                    {includeEmpty:true},
                    cell=>{

                    const length=
                    cell.value
                    ? cell.value
                        .toString()
                        .length
                    : 10;

                    if(length>maxLength)
                        maxLength=length;

                });

                column.width =
                    Math.min(
                        maxLength+2,
                        50
                    );

            });
        }

        // ========================================
        // Summary row
        // ========================================

        const errorCount =
            Array.isArray(data)
            ? data.length
            : 0;

        summarySheet.addRow({
            sheet:safeSheetName,
            count:errorCount,
            nav:'Open Sheet'
        });

        // Hyperlink
        const hyperlinkCell =
            summarySheet.getCell(
                `C${summaryRowNo}`
            );

        hyperlinkCell.value = {
            text:'Open',
            hyperlink:
            `#'${safeSheetName}'!A1`
        };

        hyperlinkCell.font = {
            color:{argb:'0000FF'},
            underline:true
        };

        summaryRowNo++;
    }

    // Auto width summary columns
    summarySheet.columns.forEach(
        column=>{

        let maxLength=15;

        column.eachCell(
            {includeEmpty:true},
            cell=>{

            const length=
            cell.value
            ? cell.value
                .toString()
                .length
            : 10;

            if(length>maxLength)
                maxLength=length;

        });

        column.width=
            Math.min(
                maxLength+2,
                40
            );

    });

    await workbook.xlsx.writeFile(
        filepath
    );

    return filepath;
}

/**
 * Safe Excel sheet name
 */
function safeName(name){

    return name
        .replace(/[\\/?*[\]:]/g,'_')
        .slice(0,31);
}

module.exports = {
    createExcel
};