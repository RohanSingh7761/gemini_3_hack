import { processMessage } from './gemini.js';
import { handleCreateWallet } from './intents/create-wallet.js';
import { handleCheckBalance } from './intents/check-balance.js';
import { handleInrTransaction } from './intents/inr-transac.js';
import { handleEthTransfer } from './intents/eth-transfer.js';
import { handleErc20Transfer } from './intents/erc-20-transfer.js';
import { handleSwapAndSendOnChain } from './intents/swap-and-send-on-chain.js';
import { handleSwapAndSendCrossChain } from './intents/swap-and-send-cross-chain.js';
import { handleOtherMisc } from './intents/other-misc.js';
import { handleOtherTrash } from './intents/other-trash.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('=== Gemini Chat Terminal ===');
console.log('Type your messages to test the intent recognition system');
console.log('Type "exit" or "quit" to close\n');

function askQuestion() {
    rl.question('You: ', async (input) => {
        const message = input.trim();
        
        if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
            console.log('Goodbye!');
            rl.close();
            process.exit(0);
        }
        
        if (!message) {
            askQuestion();
            return;
        }
        
        try {
            console.log('Processing...');
            const response = await processMessage(message);
            
            console.log('\n--- Response ---');
            console.log(JSON.stringify(response, null, 2));
            console.log('----------------\n');
            
            // Intent Router
            switch (response.intent) {
                case 'create-wallet':
                    await handleCreateWallet();
                    break;
                case 'check-balance':
                    await handleCheckBalance();
                    break;
                case 'inr-transac':
                    await handleInrTransaction();
                    break;
                case 'eth-transfer':
                    await handleEthTransfer(response.to, response.amount);
                    break;
                case 'erc-20-transfer':
                    await handleErc20Transfer(response.token, response.to, response.amount);
                    break;
                case 'swap-and-send-on-chain':
                    await handleSwapAndSendOnChain();
                    break;
                case 'swap-and-send-cross-chain':
                    await handleSwapAndSendCrossChain();
                    break;
                case 'other-misc':
                    await handleOtherMisc();
                    break;
                case 'other-trash':
                    await handleOtherTrash();
                    break;
                default:
                    console.log('Unknown intent:', response.intent);
            }
            
        } catch (error) {
            console.error('Error:', error.message);
        }
        
        askQuestion();
    });
}

askQuestion();
