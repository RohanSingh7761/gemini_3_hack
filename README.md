# BlockBuddy 🤖💼

**Your WhatsApp-powered Web3 Wallet Assistant**

BlockBuddy is an AI-powered blockchain wallet that lives right inside WhatsApp. Using natural language processing powered by Google Gemini AI, BlockBuddy understands your intent and helps you manage your Ethereum wallet through simple chat messages.

## 🌟 Features

- **💬 Natural Language Interface**: Chat with your wallet using everyday language - no technical jargon required
- **🧠 AI-Powered Intent Recognition**: Gemini AI understands what you want to do and routes your requests accordingly
- **🔐 Wallet Management**: Create and manage Ethereum wallets securely
- **💰 Balance Checking**: Instantly check your ETH and ERC-20 token balances
- **💸 Transfers**: 
  - Send ETH to addresses or ENS names
  - Transfer ERC-20 tokens
- **🔄 Token Swaps**: Swap tokens using Uniswap v4
- **🌐 Multi-Network Support**: Works on Ethereum Mainnet and Sepolia testnet
- **🏷️ ENS Support**: Lookup and send to ENS addresses
- **📊 Database Integration**: Secure wallet storage with Hasura GraphQL

## 🛠️ Tech Stack

- **Backend**: Node.js (ES Modules)
- **WhatsApp Integration**: whatsapp-web.js
- **AI/NLP**: Google Gemini AI (@google/genai)
- **Blockchain**: ethers.js v6
- **DEX Integration**: Uniswap v4 SDK
- **Database**: Hasura GraphQL
- **Server**: Express.js
- **Environment**: dotenv

## 📁 Project Structure

```
BlockBuddy/
├── WhatsappModule/
│   ├── chat.js              # Terminal-based chat interface for testing
│   ├── gemini.js            # Gemini AI integration & intent recognition
│   ├── hasura.js            # Hasura GraphQL client for database operations
│   ├── messaging.js         # WhatsApp client initialization
│   └── intents/             # Intent handlers
│       ├── create-wallet.js        # Wallet creation with encryption
│       ├── check-balance.js        # Balance checking
│       ├── eth-transfer.js         # ETH transfers
│       ├── erc-20-transfer.js      # ERC-20 token transfers
│       ├── ens-lookup.js           # ENS resolution
│       ├── swap-and-send-on-chain.js    # On-chain swaps via Uniswap
│       ├── swap-and-send-cross-chain.js # Cross-chain swaps
│       ├── inr-transac.js          # INR transactions (planned)
│       ├── other-misc.js           # General crypto queries
│       └── other-trash.js          # Unrecognized intents
├── UniswapModule/           # Uniswap integration (empty/planned)
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Cloud account (for Gemini AI API)
- A Hasura GraphQL instance
- WhatsApp account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BlockBuddy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the `WhatsappModule` directory with the following:

   ```env
   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Hasura GraphQL
   HASURA_ADMIN_SECRET=your_hasura_admin_secret_here
   
   # Encryption (32 bytes for AES-256)
   ENCRYPTION_KEY=your-32-byte-encryption-key-here
   
   # Optional: Network RPC URLs
   MAINNET_RPC_URL=your_mainnet_rpc_url
   SEPOLIA_RPC_URL=your_sepolia_rpc_url
   ```

4. **Set up Hasura Database**

   Your Hasura instance should have the following schema:

   **Users Table:**
   ```graphql
   users {
     id: UUID (primary key)
     phone: String (unique)
     created_at: Timestamp
   }
   ```

   **Wallets Table:**
   ```graphql
   wallets {
     id: UUID (primary key)
     user_id: UUID (foreign key to users)
     chain: String
     address: String
     encrypted_private_key: String
     encrypted_mnemonic: String
     created_at: Timestamp
   }
   ```

### Running the Application

**Option 1: WhatsApp Interface**
```bash
node WhatsappModule/messaging.js
```
Scan the QR code with WhatsApp to connect. (Non functional currently)

**Option 2: Terminal Interface**
```bash
node WhatsappModule/chat.js
```
Test intent recognition in the terminal without connecting to WhatsApp.

## 💬 Usage Examples

Once connected, you can interact with BlockBuddy using natural language:

### Wallet Creation
- "Create a wallet for me"
- "I want to set up a new wallet on Sepolia"
- "Make me a wallet on mainnet"

### Check Balance
- "What's my balance?"
- "How much ETH do I have?"
- "Check my balance on Sepolia"

### Send ETH
- "Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
- "Transfer 0.5 ETH to vitalik.eth"
- "Send 1 ETH to alice.eth on Sepolia"

### ERC-20 Transfers
- "Send 100 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
- "Transfer 50 DAI to alice.eth"

### Token Swaps
- "Send 1 ETH worth of USDC to alice.eth"
- "Swap and send 0.5 ETH to USDT for bob.eth"

### ENS Lookup
- "Who owns vitalik.eth?"
- "Look up buterin.eth"

### General Questions
- "What is Ethereum?"
- "How do gas fees work?"
- "Explain what a smart contract is"

## 🔒 Security Features

- **Encrypted Storage**: Private keys and mnemonics are encrypted using AES-256 before storage
- **Secure Key Management**: Encryption keys stored in environment variables
- **Database Security**: Hasura GraphQL with admin secret authentication
- **Phone-based Authentication**: Each wallet is tied to a verified WhatsApp phone number

## 🧩 How It Works

1. **User sends a message** via WhatsApp
2. **Gemini AI analyzes** the message and determines the intent
3. **Intent Router** directs to the appropriate handler
4. **Handler executes** the blockchain operation (create wallet, transfer, swap, etc.)
5. **Response sent back** to user via WhatsApp

### Intent Recognition

The Gemini AI model is trained to recognize the following intents:

- `create-wallet` - Wallet creation requests
- `check-balance` - Balance inquiries
- `eth-transfer` - ETH transfer requests
- `erc-20-transfer` - Token transfer requests
- `ens-lookup` - ENS address lookups
- `swap-and-send-on-chain` - On-chain token swaps
- `swap-and-send-cross-chain` - Cross-chain swaps
- `inr-transac` - INR-based transactions (planned)
- `other-misc` - General crypto questions
- `other-trash` - Unrelated messages

### Network Detection

BlockBuddy automatically detects which network you want to use:
- Keywords like "mainnet", "sepolia", "testnet" are recognized
- Defaults to **mainnet** if not specified
- All operations respect the specified network

## 🚧 Planned Features

- [ ] Cross-chain token swaps
- [ ] INR to crypto transactions
- [ ] Transaction history queries
- [ ] Gas price optimization
- [ ] Multi-signature wallets
- [ ] NFT support
- [ ] DeFi protocol integrations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Disclaimer

This is an experimental project. Use at your own risk. Always:
- Test on Sepolia testnet first
- Never share your private keys or mnemonics
- Use small amounts for testing
- Verify all transaction details before confirming

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

---

**Made with ❤️ for the Web3 community**
