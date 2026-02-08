import { JsonRpcProvider } from "ethers";
import dotenv from 'dotenv';

dotenv.config({ path: './WhatsappModule/.env' });

const ALCHEMY_URL = process.env.ALCHEMY_URL;

async function testENS() {
    console.log('Testing ENS resolution...');
    console.log('Alchemy URL:', ALCHEMY_URL);
    
    const provider = new JsonRpcProvider(ALCHEMY_URL);
    
    // Test network
    const network = await provider.getNetwork();
    console.log('Network:', network.name, 'Chain ID:', network.chainId.toString());
    
    // Test ENS resolution
    try {
        console.log('\nResolving rschauhan.eth...');
        const address = await provider.resolveName('rschauhan.eth');
        console.log('Resolved address:', address);
        
        if (address) {
            // Try reverse resolution
            console.log('\nReverse lookup...');
            const name = await provider.lookupAddress(address);
            console.log('Reverse resolved name:', name);
        }
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
}

testENS();
