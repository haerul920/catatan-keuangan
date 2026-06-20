/**
 * Adds a new transaction row to the spreadsheet.
 */
export declare function catatData(date: string, category: string, amount: number, description: string, type: string): Promise<string>;
/**
 * Calculates total expenses and income for a given month.
 * target_month format expected to be 'YYYY-MM'
 */
export declare function readThisMonthData(target_month: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    message: string;
    target_month?: never;
    balance?: never;
} | {
    target_month: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    message?: never;
}>;
//# sourceMappingURL=sheets.d.ts.map