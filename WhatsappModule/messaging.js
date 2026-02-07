import { Client } from 'whatsapp-web.js';
import { processMessage } from './gemini.js';
import qrcode from 'qrcode-terminal';

const client = new Client();

client.on('qr', (qr) => {
    console.log('QR RECEIVED - Scan QR Code to log in:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {
    console.log('Received:', msg.body);
    
    // Send message to Gemini for processing
    const response = await processMessage(msg.body);
    
    // Print only the message part
    if (response && response.message) {
        console.log(response.message);
    }
});

client.initialize();