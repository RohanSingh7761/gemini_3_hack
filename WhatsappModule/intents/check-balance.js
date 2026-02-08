import { JsonRpcProvider, formatEther } from "ethers";
import { getUserByPhone, getWalletByUserAndChain } from "../hasura.js";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import 'dotenv/config';

// Get local phone file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCAL_PHONE_FILE = join(__dirname, '.last-phone.txt');

// Alchemy provider endpoint
const ALCHEMY_URL = process.env.ALCHEMY_URL;
const DEFAULT_CHAIN = "ethereum";

export async function handleCheckBalance() {
    console.log('✓ handleCheckBalance executed');
    
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
        
        console.log(`📍 Wallet Address: ${wallet.address}`);
        
        // 4. Create provider and fetch balance
        console.log('🔍 Fetching balance from Ethereum mainnet...');
        const provider = new JsonRpcProvider(ALCHEMY_URL);
        const balanceWei = await provider.getBalance(wallet.address);
        const balanceEth = formatEther(balanceWei);
        
        // 5. Display results
        console.log('\n💰 Balance Information:');
        console.log(`   Address: ${wallet.address}`);
        console.log(`   Balance: ${balanceEth} ETH`);
        console.log(`   Chain: ${DEFAULT_CHAIN}`);
        
        return {
            success: true,
            address: wallet.address,
            balance: balanceEth,
            balanceWei: balanceWei.toString(),
            chain: DEFAULT_CHAIN
        };
        
    } catch (error) {
        console.error('❌ Error checking balance:', error.message);
        return {
            success: false,
            message: `Failed to check balance: ${error.message}`
        };
    }
}
