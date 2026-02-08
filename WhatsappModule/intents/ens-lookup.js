import { JsonRpcProvider } from "ethers";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory path and load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const ALCHEMY_URL = process.env.ALCHEMY_URL;

/**
 * Lookup comprehensive ENS information
 * @param {string} ensName - ENS name to lookup (e.g., "vitalik.eth")
 * @returns {Object} ENS details or error
 */
export async function ensLookup(ensName) {
    console.log('✓ ensLookup executed for:', ensName);
    
    try {
        // Validate ENS name format
        if (!ensName || !ensName.includes('.')) {
            return {
                success: false,
                message: 'Invalid ENS name format. Please provide a valid ENS name (e.g., name.eth)'
            };
        }

        const provider = new JsonRpcProvider(ALCHEMY_URL);
        console.log(`🔍 Looking up ENS: ${ensName}...`);

        // 1. Resolve ENS to address
        const address = await provider.resolveName(ensName);
        
        if (!address) {
            console.log('❌ ENS name not found or not configured.');
            return {
                success: false,
                message: `ENS name "${ensName}" does not exist or has no address configured.`
            };
        }

        console.log(`✓ ENS exists! Address: ${address}`);

        // 2. Get ENS Resolver
        const resolver = await provider.getResolver(ensName);
        
        if (!resolver) {
            return {
                success: true,
                ensName: ensName,
                address: address,
                message: `ENS found but no resolver configured.\n\nAddress: ${address}`
            };
        }

        console.log('📋 Fetching all ENS records...');

        // 3. Fetch all available ENS records
        const [
            avatar,
            email,
            url,
            description,
            twitter,
            github,
            contentHash,
            btcAddress,
            ltcAddress,
            dogeAddress,
        ] = await Promise.allSettled([
            resolver.getText('avatar'),
            resolver.getText('email'),
            resolver.getText('url'),
            resolver.getText('description'),
            resolver.getText('com.twitter'),
            resolver.getText('com.github'),
            resolver.getContentHash(),
            resolver.getAddress(0), // BTC (coin type 0)
            resolver.getAddress(2), // LTC (coin type 2)
            resolver.getAddress(3), // DOGE (coin type 3)
        ]);

        // Helper to extract value from settled promise
        const getValue = (result) => result.status === 'fulfilled' && result.value ? result.value : null;

        // Build comprehensive ENS data
        const ensData = {
            success: true,
            ensName: ensName,
            ethAddress: address,
            
            // Text Records
            textRecords: {
                avatar: getValue(avatar),
                email: getValue(email),
                url: getValue(url),
                description: getValue(description),
                twitter: getValue(twitter),
                github: getValue(github),
            },
            
            // Crypto Addresses
            cryptoAddresses: {
                eth: address,
                btc: getValue(btcAddress),
                ltc: getValue(ltcAddress),
                doge: getValue(dogeAddress),
            },
            
            // Content Hash (IPFS/Swarm)
            contentHash: getValue(contentHash),
        };

        // 4. Reverse resolution check
        try {
            const reverseName = await provider.lookupAddress(address);
            ensData.primaryName = reverseName;
            ensData.isPrimaryName = reverseName === ensName;
        } catch (e) {
            ensData.primaryName = null;
            ensData.isPrimaryName = false;
        }

        // Format message
        let message = `🎯 ENS Lookup Results for: ${ensName}\n\n`;
        message += `📍 ETH Address: ${address}\n`;
        
        if (ensData.isPrimaryName) {
            message += `✅ This is the primary ENS for this address\n`;
        } else if (ensData.primaryName) {
            message += `ℹ️ Primary ENS: ${ensData.primaryName}\n`;
        }
        
        message += `\n📝 Text Records:\n`;
        const textRecords = ensData.textRecords;
        if (textRecords.avatar) message += `  • Avatar: ${textRecords.avatar}\n`;
        if (textRecords.email) message += `  • Email: ${textRecords.email}\n`;
        if (textRecords.url) message += `  • URL: ${textRecords.url}\n`;
        if (textRecords.description) message += `  • Description: ${textRecords.description}\n`;
        if (textRecords.twitter) message += `  • Twitter: ${textRecords.twitter}\n`;
        if (textRecords.github) message += `  • GitHub: ${textRecords.github}\n`;
        if (Object.values(textRecords).every(v => !v)) {
            message += `  (No text records set)\n`;
        }
        
        message += `\n💰 Crypto Addresses:\n`;
        const crypto = ensData.cryptoAddresses;
        message += `  • ETH: ${crypto.eth}\n`;
        if (crypto.btc) message += `  • BTC: ${crypto.btc}\n`;
        if (crypto.ltc) message += `  • LTC: ${crypto.ltc}\n`;
        if (crypto.doge) message += `  • DOGE: ${crypto.doge}\n`;
        
        if (ensData.contentHash) {
            message += `\n🌐 Content Hash: ${ensData.contentHash}\n`;
        }

        ensData.message = message;

        console.log('\n' + message);
        return ensData;

    } catch (error) {
        console.error('❌ Error in ensLookup:', error);
        return {
            success: false,
            message: `Error looking up ENS: ${error.message}`
        };
    }
}
