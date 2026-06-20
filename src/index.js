"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const gemini_1 = require("./gemini");
const client = new whatsapp_web_js_1.Client({
    authStrategy: new whatsapp_web_js_1.LocalAuth(),
});
client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED. Scan the QR code below with WhatsApp:');
    qrcode_terminal_1.default.generate(qr, { small: true });
});
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});
client.on('message_create', async (msg) => {
    // Debug logging to understand the message object structure
    console.log(`[DEBUG] Msg received - from: ${msg.from}, to: ${msg.to}, fromMe: ${msg.fromMe}, body: ${msg.body}`);
    // Ensure the message contains a text body
    if (!msg.body)
        return;
    // Additional check to ignore any group messages
    if ((msg.from && msg.from.includes('@g.us')) || (msg.to && msg.to.includes('@g.us')))
        return;
    // 1. Strict validation filter: only process send-to-self messages
    // The message must originate from your own number
    if (!msg.fromMe) {
        console.log(`[DEBUG] Ignored: Not from me.`);
        return;
    }
    const fromBase = msg.from ? msg.from.split(':')[0].split('@')[0] : '';
    const toBase = msg.to ? msg.to.split(':')[0].split('@')[0] : '';
    // WhatsApp multi-device uses a special internal ID ending in "@lid" for the "Message yourself" chat,
    // or it uses your own base number. We check for either!
    const isToSelf = (fromBase === toBase) || msg.to.endsWith('@lid');
    if (!isToSelf) {
        console.log(`[DEBUG] Ignored: Not a send-to-self message (to: ${msg.to})`);
        return;
    }
    // Prevent infinite loops! The bot shouldn't process its own replies.
    // We will prefix all bot replies with '🤖' and ignore any message that starts with it.
    if (msg.body.startsWith('🤖'))
        return;
    console.log(`[DEBUG] Valid send-to-self message detected! Proceeding to Gemini...`);
    // Show typing indicator
    const chat = await msg.getChat();
    await chat.sendStateTyping();
    try {
        const reply = await (0, gemini_1.processMessage)(msg.body);
        await msg.reply('🤖 ' + reply);
    }
    catch (error) {
        console.error('Error responding to message:', error);
        await msg.reply(`🤖 Oops, an error occurred:\n\n*${error.message || 'Unknown error'}*\n\nMake sure your API keys (like Gemini) and credentials are correct!`);
    }
    finally {
        await chat.clearState();
    }
});
client.initialize();
