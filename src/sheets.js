"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catatData = catatData;
exports.readThisMonthData = readThisMonthData;
const googleapis_1 = require("googleapis");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load credentials from the JSON file
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'credentials.json';
const credentials = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), credentialsPath), 'utf8'));
const auth = new googleapis_1.google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.SPREADSHEET_ID;
/**
 * Adds a new transaction row to the spreadsheet.
 */
async function catatData(date, category, amount, description, type) {
    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:E', // Adjust if your sheet name is different
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[date, category, amount, description, type]],
            },
        });
        return `Transaction recorded successfully. ID: ${response.data.updates?.updatedRange}`;
    }
    catch (error) {
        console.error('Error in catatData:', error);
        throw new Error('Failed to record transaction');
    }
}
/**
 * Calculates total expenses and income for a given month.
 * target_month format expected to be 'YYYY-MM'
 */
async function readThisMonthData(target_month) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:E',
        });
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return { totalIncome: 0, totalExpense: 0, message: 'No data found.' };
        }
        let totalIncome = 0;
        let totalExpense = 0;
        // Assuming first row is header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const date = row[0]; // Format: YYYY-MM-DD
            const amount = parseFloat(row[2]);
            const type = row[4].toLowerCase();
            if (date && date.startsWith(target_month)) {
                if (type === 'income' || type === 'pemasukan') {
                    totalIncome += amount;
                }
                else if (type === 'expense' || type === 'pengeluaran') {
                    totalExpense += amount;
                }
            }
        }
        return {
            target_month,
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense
        };
    }
    catch (error) {
        console.error('Error in readThisMonthData:', error);
        throw new Error('Failed to read data');
    }
}
