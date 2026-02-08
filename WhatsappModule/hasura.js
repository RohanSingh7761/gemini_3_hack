import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from WhatsappModule folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const HASURA_ENDPOINT = 'https://block-buddy.hasura.app/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * Execute a GraphQL query/mutation against Hasura
 * @param {string} query - GraphQL query or mutation
 * @param {object} variables - Variables for the query
 * @returns {Promise<object>} - Response data
 */
export async function executeGraphQL(query, variables = {}) {
    const response = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        },
        body: JSON.stringify({
            query,
            variables,
        }),
    });

    const result = await response.json();

    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        throw new Error(result.errors[0].message);
    }

    return result.data;
}

// ==================== USER OPERATIONS ====================

/**
 * Get or create a user by phone number
 * @param {string} phone - Phone number
 * @returns {Promise<object>} - User object with id
 */
export async function getOrCreateUser(phone) {
    const query = `
        mutation UpsertUser($phone: String!) {
            insert_users_one(
                object: { phone: $phone }
                on_conflict: {
                    constraint: users_phone_key,
                    update_columns: []
                }
            ) {
                id
                phone
                created_at
            }
        }
    `;

    const data = await executeGraphQL(query, { phone });
    return data.insert_users_one;
}

/**
 * Get user by phone number
 * @param {string} phone - Phone number
 * @returns {Promise<object|null>} - User object or null
 */
export async function getUserByPhone(phone) {
    const query = `
        query GetUserByPhone($phone: String!) {
            users(where: { phone: { _eq: $phone } }) {
                id
                phone
                created_at
            }
        }
    `;

    const data = await executeGraphQL(query, { phone });
    return data.users[0] || null;
}

// ==================== WALLET OPERATIONS ====================

/**
 * Create a new wallet for a user
 * @param {string} userId - User UUID
 * @param {string} chain - Chain name (e.g., 'ethereum', 'polygon', 'base')
 * @param {string} address - Wallet address
 * @param {string} encryptedPrivateKey - Encrypted private key
 * @param {string} encryptedMnemonic - Encrypted mnemonic phrase
 * @returns {Promise<object>} - Created wallet object
 */
export async function createWallet(userId, chain, address, encryptedPrivateKey, encryptedMnemonic) {
    const query = `
        mutation CreateWallet(
            $user_id: uuid!,
            $chain: String!,
            $address: String!,
            $encrypted_private_key: String!,
            $encrypted_mnemonic: String!
        ) {
            insert_wallets_one(
                object: {
                    user_id: $user_id,
                    chain: $chain,
                    address: $address,
                    encrypted_private_key: $encrypted_private_key,
                    encrypted_mnemonic: $encrypted_mnemonic
                }
            ) {
                id
                user_id
                chain
                address
                created_at
            }
        }
    `;

    const data = await executeGraphQL(query, {
        user_id: userId,
        chain,
        address,
        encrypted_private_key: encryptedPrivateKey,
        encrypted_mnemonic: encryptedMnemonic,
    });

    return data.insert_wallets_one;
}

/**
 * Get wallet by user ID and chain
 * @param {string} userId - User UUID
 * @param {string} chain - Chain name
 * @returns {Promise<object|null>} - Wallet object or null
 */
export async function getWalletByUserAndChain(userId, chain) {
    const query = `
        query GetWallet($user_id: uuid!, $chain: String!) {
            wallets(where: { 
                user_id: { _eq: $user_id }, 
                chain: { _eq: $chain } 
            }) {
                id
                user_id
                chain
                address
                encrypted_private_key
                encrypted_mnemonic
                created_at
            }
        }
    `;

    const data = await executeGraphQL(query, { user_id: userId, chain });
    return data.wallets[0] || null;
}

/**
 * Get all wallets for a user
 * @param {string} userId - User UUID
 * @returns {Promise<array>} - Array of wallet objects
 */
export async function getWalletsByUser(userId) {
    const query = `
        query GetUserWallets($user_id: uuid!) {
            wallets(where: { user_id: { _eq: $user_id } }) {
                id
                chain
                address
                created_at
            }
        }
    `;

    const data = await executeGraphQL(query, { user_id: userId });
    return data.wallets;
}

/**
 * Get wallet by address
 * @param {string} address - Wallet address
 * @returns {Promise<object|null>} - Wallet object or null
 */
export async function getWalletByAddress(address) {
    const query = `
        query GetWalletByAddress($address: String!) {
            wallets(where: { address: { _eq: $address } }) {
                id
                user_id
                chain
                address
                encrypted_private_key
                encrypted_mnemonic
                created_at
            }
        }
    `;

    const data = await executeGraphQL(query, { address });
    return data.wallets[0] || null;
}
