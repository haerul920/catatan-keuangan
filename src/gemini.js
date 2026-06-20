"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatSession = void 0;
exports.processMessage = processMessage;
const generative_ai_1 = require("@google/generative-ai");
const sheets_1 = require("./sheets");
console.log("API Key Status:", process.env.GEMINI_API_KEY ? "Successfully Detected" : "Failed Detected");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
const recordTransactionDeclaration = {
    name: 'record_transaction',
    description: 'Records a new financial transaction (income or expense) into the Google Sheet.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            amount: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'The numeric amount of the transaction.',
            },
            category: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'The category of the transaction, e.g., Food, Transport, Salary.',
            },
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'A brief description of what the transaction was for.',
            },
            type: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'The type of transaction, must be exactly "Income" or "Expense".',
            },
            date: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'The date of the transaction in YYYY-MM-DD format.'
            }
        },
        required: ['amount', 'category', 'description', 'type', 'date'],
    },
};
const checkSummaryDeclaration = {
    name: 'check_summary',
    description: 'Checks the total income, expense, and balance for a specific month.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            target_month: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'The target month to check in YYYY-MM format.',
            },
        },
        required: ['target_month'],
    },
};
const tools = [
    {
        functionDeclarations: [recordTransactionDeclaration, checkSummaryDeclaration],
    },
];
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro-latest',
    tools: tools,
    systemInstruction: `You are an intelligent personal finance assistant on WhatsApp.
Your job is to help users manage their finances by recording their transactions and checking their summaries.
When a user tells you they spent or received money, extract the amount, category, description, date (in YYYY-MM-DD), and transaction type (Income/Expense), and call the record_transaction tool.
If the user doesn't specify a date, use today's date. Today is ${new Date().toISOString().split('T')[0]}.
When a user asks for a summary or their balance for a specific month, extract the target month in YYYY-MM format and call the check_summary tool.
Always be polite, provide useful financial advice if appropriate, and communicate concisely.
Do not make up function results. After calling a function, use the result to form your final answer in natural language.`,
});
exports.chatSession = model.startChat();
async function processMessage(message) {
    const result = await exports.chatSession.sendMessage(message);
    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'record_transaction') {
            const args = call.args;
            const funcResult = await (0, sheets_1.catatData)(args.date, args.category, args.amount, args.description, args.type);
            // Send the result back to Gemini so it can generate a natural response
            const followUpResult = await exports.chatSession.sendMessage([{
                    functionResponse: {
                        name: 'record_transaction',
                        response: { result: funcResult }
                    }
                }]);
            return followUpResult.response.text();
        }
        else if (call.name === 'check_summary') {
            const args = call.args;
            const funcResult = await (0, sheets_1.readThisMonthData)(args.target_month);
            const followUpResult = await exports.chatSession.sendMessage([{
                    functionResponse: {
                        name: 'check_summary',
                        response: { result: funcResult }
                    }
                }]);
            return followUpResult.response.text();
        }
    }
    return result.response.text();
}
