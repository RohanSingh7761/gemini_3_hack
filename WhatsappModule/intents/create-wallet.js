import { Wallet } from "ethers";
import { getOrCreateUser, createWallet, getWalletByUserAndChain } from "../hasura.js";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCAL_PHONE_FILE = join(__dirname, '.last-phone.txt');

// Default chain for wallet creation
const DEFAULT_CHAIN = "ethereum";

// Encryption key from environment (should be 32 bytes for AES-256)
// In production, use a proper key management system
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-byte-key-for-testing!';

/**
 * Get stored phone number or generate a new one
 * @param {boolean} forceNew - Force generate a new number
 * @returns {string} Phone number
 */
function getOrGeneratePhone(forceNew = false) {
    // Try to read existing phone number
    if (!forceNew && fs.existsSync(LOCAL_PHONE_FILE)) {
        const storedPhone = fs.readFileSync(LOCAL_PHONE_FILE, 'utf8').trim();
        if (storedPhone) {
            console.log('📂 Using stored phone number from .last-phone.txt');
            return storedPhone;
        }
    }
    
    // Generate new phone number
    const firstDigit = Math.floor(Math.random() * 4) + 6;
    const remainingDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    const newPhone = `${firstDigit}${remainingDigits}`;
    
    // Save to file
    fs.writeFileSync(LOCAL_PHONE_FILE, newPhone, 'utf8');
    console.log('💾 Saved new phone number to .last-phone.txt');
    
    return newPhone;
}

/**
 * Clear the stored phone number (use when you want a fresh number)
 */
export function clearStoredPhone() {
    if (fs.existsSync(LOCAL_PHONE_FILE)) {
        fs.unlinkSync(LOCAL_PHONE_FILE);
        console.log('🗑️ Cleared stored phone number');
    }
}

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted string (iv:authTag:encryptedData in hex)
 */
function encrypt(text) {
    const iv = crypto.randomBytes(12); // 96 bits for GCM
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32); // Derive 32-byte key
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Return iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string using AES-256-GCM
 * @param {string} encryptedText - Encrypted string (iv:authTag:encryptedData in hex)
 * @returns {string} Decrypted plain text
 */
export function decrypt(encryptedText) {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

export async function handleCreateWallet() {
    console.log('✓ handleCreateWallet executed');

    try {
        // 1. Get stored phone or generate new one
        const phoneNumber = getOrGeneratePhone();
        console.log(`📱 Generated phone number: ${phoneNumber}`);
        const user = await getOrCreateUser(phoneNumber);
        console.log(`👤 User ID: ${user.id}`);

        // 2. Check if user already has a wallet for this chain
        const existingWallet = await getWalletByUserAndChain(user.id, DEFAULT_CHAIN);
        if (existingWallet) {
            console.log(`⚠️ Wallet already exists for ${DEFAULT_CHAIN}!`);
            console.log(`📍 Existing Address: ${existingWallet.address}`);
            return {
                success: false,
                message: `You already have a wallet for ${DEFAULT_CHAIN}`,
                address: existingWallet.address
            };
        }

        // 3. Generate new wallet
        console.log('🔐 Generating new wallet...');
        const wallet = Wallet.createRandom();

        // 4. Encrypt private key and mnemonic using AES-256-GCM
        console.log('🔒 Encrypting sensitive data...');
        const encryptedPrivateKey = encrypt(wallet.privateKey);
        const encryptedMnemonic = encrypt(wallet.mnemonic.phrase);

        // 5. Store wallet in database
        console.log('💾 Storing wallet in database...');
        const savedWallet = await createWallet(
            user.id,
            DEFAULT_CHAIN,
            wallet.address,
            encryptedPrivateKey,
            encryptedMnemonic
        );

        // 6. Log success
        console.log('✅ Wallet created successfully!');
        console.log(`📍 Address: ${wallet.address}`);
        console.log(`🔗 Chain: ${DEFAULT_CHAIN}`);
        console.log(`🆔 Wallet ID: ${savedWallet.id}`);
        console.log(`private key: ${wallet.privateKey}`);
        console.log(`mnemonic: ${wallet.mnemonic.phrase}`);
        console.log('Please delete this message after noting down your private key and mnemonic!');

        return {
            success: true,
            message: 'Wallet created successfully!',
            address: wallet.address,
            chain: DEFAULT_CHAIN,
            walletId: savedWallet.id
        };

    } catch (error) {
        console.error('❌ Error creating wallet:', error.message);
        return {
            success: false,
            message: `Failed to create wallet: ${error.message}`
        };
    }
}
