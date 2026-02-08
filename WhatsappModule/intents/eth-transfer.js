import { JsonRpcProvider, Wallet, parseEther, formatEther, formatUnits } from "ethers";
import { getUserByPhone, getWalletByUserAndChain } from "../hasura.js";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import dotenv from 'dotenv';

// Get local phone file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCAL_PHONE_FILE = join(__dirname, '.last-phone.txt');

// Load .env from WhatsappModule folder
dotenv.config({ path: join(__dirname, '..', '.env') });

// Alchemy provider endpoint
const ALCHEMY_URL = process.env.ALCHEMY_URL;
const DEFAULT_CHAIN = "ethereum";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-byte-key-for-testing!';

/**
 * Decrypt private key using AES-256-GCM (matching the encryption in create-wallet.js)
 * @param {string} encryptedKey - Encrypted private key (iv:authTag:encryptedData in hex)
 * @returns {string} Decrypted private key
 */
function decryptPrivateKey(encryptedKey) {
    const [ivHex, authTagHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * Handle ETH transfer with ENS resolution support
 * @param {string} to - Receiver address or ENS name
 * @param {string} amount - Amount to send in wei (will be converted to ETH for display)
 * @param {boolean} ens - Whether 'to' is an ENS name (true) or address (false)
 * @returns {Object} Transfer result
 */
export async function handleEthTransfer(to, amount, ens = false) {
    console.log('✓ handleEthTransfer executed with:', { to, amount, ens });
    
    // Convert amount from wei to ETH for processing
    const amountInEth = formatUnits(amount, 'ether');
    console.log(`💵 Amount: ${amountInEth} ETH (${amount} wei)`);
    
    try {
        // 1. Get stored phone number
        if (!fs.existsSync(LOCAL_PHONE_FILE)) {
            console.log('❌ No wallet found. Please create a wallet first.');
            return {
                success: false,
                message: 'No wallet found. Please create a wallet first.'
            };
        }
        
        const phoneNumber = fs.readFileSync(LOCAL_PHONE_FILE, 'utf8').trim();
        console.log(`📱 Using phone number: ${phoneNumber}`);
        
        // 2. Get user from database
        const user = await getUserByPhone(phoneNumber);
        if (!user) {
            console.log('❌ User not found in database.');
            return {
                success: false,
                message: 'User not found. Please create a wallet first.'
            };
        }
        
        console.log(`👤 User ID: ${user.id}`);
        
        // 3. Get user's wallet for Ethereum
        const wallet = await getWalletByUserAndChain(user.id, DEFAULT_CHAIN);
        if (!wallet) {
            console.log(`❌ No ${DEFAULT_CHAIN} wallet found for this user.`);
            return {
                success: false,
                message: `No ${DEFAULT_CHAIN} wallet found. Please create a wallet first.`
            };
        }
        
        console.log(`💼 Wallet address: ${wallet.address}`);
        
        // 4. Validate encrypted private key exists
        if (!wallet.encrypted_private_key) {
            console.log('❌ No encrypted private key found in wallet.');
            return {
                success: false,
                message: 'Wallet configuration error: No private key found.'
            };
        }
        
        // 5. Set up provider and wallet
        const provider = new JsonRpcProvider(ALCHEMY_URL);
        const decryptedKey = decryptPrivateKey(wallet.encrypted_private_key);
        const signer = new Wallet(decryptedKey, provider);
        
        // 6. Resolve ENS if needed
        let recipientAddress = to;
        if (ens) {
            console.log(`🔍 Resolving ENS name: ${to}`);
            try {
                const resolvedAddress = await provider.resolveName(to);
                
                if (!resolvedAddress) {
                    console.log('❌ ENS name could not be resolved.');
                    return {
                        success: false,
                        message: `Could not resolve ENS name: ${to}. Please verify the name is correct.`
                    };
                }
                
                recipientAddress = resolvedAddress;
                console.log(`✓ ENS resolved to: ${recipientAddress}`);
            } catch (ensError) {
                console.error('❌ Error resolving ENS:', ensError.message);
                return {
                    success: false,
                    message: `Failed to resolve ENS name ${to}: ${ensError.message}`
                };
            }
        }
        
        // 7. Check balance
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = formatEther(balance);
        console.log(`💰 Current balance: ${balanceInEth} ETH`);
        
        // Amount is already in wei from the parameter
        const amountInWei = BigInt(amount);
        
        // Check if sufficient balance
        if (balance < amountInWei) {
            console.log('❌ Insufficient balance.');
            return {
                success: false,
                message: `Insufficient balance. You have ${balanceInEth} ETH, but trying to send ${amountInEth} ETH.`
            };
        }
        
        // 8. Estimate gas
        const feeData = await provider.getFeeData();
        const gasLimit = 21000n; // Standard ETH transfer gas limit
        const estimatedGasCost = feeData.gasPrice * gasLimit;
        const totalCost = amountInWei + estimatedGasCost;
        
        if (balance < totalCost) {
            const estimatedGasInEth = formatEther(estimatedGasCost);
            console.log('❌ Insufficient balance for gas.');
            return {
                success: false,
                message: `Insufficient balance for gas. Need ${formatEther(totalCost)} ETH (${amountInEth} ETH + ~${estimatedGasInEth} ETH gas).`
            };
        }
        
        // 9. Send message if ENS was resolved
        let statusMessage = '';
        if (ens) {
            statusMessage = `Sending ${amountInEth} ETH to ${recipientAddress} (resolved from ${to})...\n`;
            console.log(statusMessage);
        }
        
        // 10. Send transaction
        console.log(`📤 Sending ${amountInEth} ETH to ${recipientAddress}...`);
        const tx = await signer.sendTransaction({
            to: recipientAddress,
            value: amountInWei,
            gasLimit: gasLimit
        });
        
        console.log(`⏳ Transaction sent. Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log('✅ Transaction confirmed!');
            return {
                success: true,
                message: `${statusMessage}✅ Successfully sent ${amountInEth} ETH to ${recipientAddress}\n\nTransaction hash: ${tx.hash}\nBlock: ${receipt.blockNumber}`,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                to: recipientAddress,
                amount: amountInEth
            };
        } else {
            console.log('❌ Transaction failed.');
            return {
                success: false,
                message: 'Transaction failed. Please try again.',
                txHash: tx.hash
            };
        }
        
    } catch (error) {
        console.error('❌ Error in handleEthTransfer:', error);
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    }
}
