import { GoogleGenerativeAI, FunctionDeclaration, Tool, Schema, SchemaType } from '@google/generative-ai';
import { catatData, readThisMonthData } from './sheets';

console.log("API Key Status:", process.env.GEMINI_API_KEY ? "Successfully Detected" : "Failed Detected");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());

const recordTransactionDeclaration: FunctionDeclaration = {
  name: 'record_transaction',
  description: 'Records a new financial transaction (income or expense) into the Google Sheet.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      amount: {
        type: SchemaType.NUMBER,
        description: 'The numeric amount of the transaction.',
      },
      category: {
        type: SchemaType.STRING,
        description: 'The category of the transaction, e.g., Food, Transport, Salary.',
      },
      description: {
        type: SchemaType.STRING,
        description: 'A brief description of what the transaction was for.',
      },
      type: {
        type: SchemaType.STRING,
        description: 'The type of transaction: Pemasukan or Pengeluaran.',
      },
      date: {
          type: SchemaType.STRING,
          description: 'The date of the transaction in YYYY-MM-DD format.'
      }
    },
    required: ['amount', 'category', 'description', 'type', 'date'],
  },
};

const checkSummaryDeclaration: FunctionDeclaration = {
  name: 'check_summary',
  description: 'Checks the total income, expense, and balance for a specific month.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      target_month: {
        type: SchemaType.STRING,
        description: 'The target month to check in YYYY-MM format.',
      },
    },
    required: ['target_month'],
  },
};

const tools: Tool[] = [
  {
    functionDeclarations: [recordTransactionDeclaration, checkSummaryDeclaration],
  },
];

const model = genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  tools: tools,
  systemInstruction: `Anda adalah asisten keuangan pribadi yang cerdas di WhatsApp.
Pekerjaan Anda adalah membantu pengguna mengelola keuangan mereka dengan mencatat transaksi dan memeriksa ringkasan mereka.
Gunakan bahasa Indonesia yang santai dan ramah.
Jika pengguna menyebutkan pengeluaran (misalnya membeli makan, bayar tagihan), catat sebagai 'Pengeluaran'.
Jika pengguna menyebutkan pendapatan (misalnya gaji, dikasih uang), catat sebagai 'Pemasukan'.
Jika pengguna tidak menyebutkan tanggal, gunakan tanggal hari ini: ${new Date().toISOString().split('T')[0]}.
Saat pengguna meminta ringkasan atau saldo untuk bulan tertentu, ambil bulan target dalam format YYYY-MM dan panggil fungsi check_summary.
Selalu bersikap sopan, berikan saran keuangan yang berguna jika perlu, dan berkomunikasi dengan ringkas.
Jangan mengarang hasil fungsi. Setelah memanggil fungsi, gunakan hasilnya untuk memberikan jawaban akhir dalam bahasa alami.`,
});

export const chatSession = model.startChat();

export async function processMessage(message: string): Promise<string> {
    const result = await chatSession.sendMessage(message);
    
    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        
        if (call.name === 'record_transaction') {
            const args = call.args as any;
            const funcResult = await catatData(args.date, args.category, args.amount, args.description, args.type);
            
            // Send the result back to Gemini so it can generate a natural response
            const followUpResult = await chatSession.sendMessage([{
                functionResponse: {
                    name: 'record_transaction',
                    response: { result: funcResult }
                }
            }]);
            return followUpResult.response.text();
        } else if (call.name === 'check_summary') {
            const args = call.args as any;
            const funcResult = await readThisMonthData(args.target_month);
            
            const followUpResult = await chatSession.sendMessage([{
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
