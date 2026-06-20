import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Load credentials from the JSON file
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'credentials.json';
const credentials = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), credentialsPath), 'utf8'));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.SPREADSHEET_ID!;

/**
 * Adds a new transaction row to the spreadsheet.
 */
export async function catatData(date: string, category: string, amount: number, description: string, type: string) {
  try {
    // Cari baris kosong pertama berdasarkan Kolom A (Tanggal)
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:A',
    });
    
    const numRows = getRes.data.values ? getRes.data.values.length : 0;
    // Baris berikutnya adalah panjang array + 1. Jika kosong sama sekali, mulai dari baris 2 (mengabaikan header).
    const nextRow = Math.max(numRows + 1, 2);
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${nextRow}:E${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, category, amount, description, type]],
      },
    }) as any;
    return `Transaction recorded successfully on row ${nextRow}.`;
  } catch (error) {
    console.error('Error in catatData:', error);
    throw new Error('Failed to record transaction');
  }
}

/**
 * Calculates total expenses and income for a given month.
 * target_month format expected to be 'YYYY-MM'
 */
export async function readThisMonthData(target_month: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:E',
    }) as any;

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { totalIncome: 0, totalExpense: 0, message: 'No data found.' };
    }

    let totalIncome = 0;
    let totalExpense = 0;

    // Assuming first row is header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const date = row[0] as string; // Format: YYYY-MM-DD
      const amount = parseFloat(row[2]);
      const type = (row[4] as string).toLowerCase();

      if (date && date.startsWith(target_month)) {
        if (type === 'income' || type === 'pemasukan') {
          totalIncome += amount;
        } else if (type === 'expense' || type === 'pengeluaran') {
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
  } catch (error) {
    console.error('Error in readThisMonthData:', error);
    throw new Error('Failed to read data');
  }
}
