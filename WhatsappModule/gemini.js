import 'dotenv/config';
import {
  GoogleGenAI,
} from '@google/genai';

export async function processMessage(messageText) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });
  const config = {
    systemInstruction: [
        {
          text: `You will receive a message from whatsapp, you are a intent recognition chatbot backend for a whatsapp based web3 wallet with a personality of a buddy that caters only to ethereum and its supported chains. You will classify the intent is which from the following options: 'create-wallet'(eg, I want to create a wallet), 'inr-transac' (eg, pay user1 1000 inr in form of eth), 'eth-tranfer'(eg, send user1 0.001eth), 'erc-20-transfer', 'swap-and-send-on-chain'(means he send user1 1eth worth of usdc or any eth supported token), 'swap-and-send-cross-chain'(send user1 1eth worth of btc or other chains) , 'other-misc'(any other query or doubt related to eth and its working),  'other-trash'(all other messages except greetings)

Based on the intent you will provide a json object in output in following format:

If 'create-wallet':
{
    intent: "",
    message: something about Creating a wallet for you in different tones, the private key and mnemonic are generated so explain what they are and to delete them after message
}

If 'check-balance':
{
    intent: "",
    message: Here is your current balance:
}

If 'inr-transac':
{
    intent: "",
    message: Sorry not supported yet but more respectful tone
}

If 'eth-tranfer':
{
    intent: ,
    to: address of receiver,
    amount: address to send in wei (convert from given eth in text)
}

If 'erc-20-transfer':
{
    intent: ,
    token: address of token to be sent
    to: address of receiver,
    amount: address to send in wei (convert from given eth in text)
}

If  'swap-and-send-on-chain':
{
    intent: "",
    message: Sorry not supported yet but more respectful tone
}

If  'swap-and-send-cross-chain':
{
    intent: "",
    message: Sorry not supported yet but more respectful tone
}

If 'other-misc': 
{
    intent: "",
    message: answer the query
}

If 'other-trash': 
{
    intent: "",
    message: Dont ask such questions, if greetings then greet properly
}`,
        }
    ],
  };
  const model = 'gemini-3-flash-preview';
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: messageText,
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });
  
  let fullResponse = '';
  for await (const chunk of response) {
    fullResponse += chunk.text;
  }
  
  // Parse the JSON response and return it
  try {
    // Remove markdown code blocks if present
    let cleanResponse = fullResponse.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const jsonResponse = JSON.parse(cleanResponse);
    return jsonResponse;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    console.error('Raw response:', fullResponse);
    return { intent: 'error', message: 'Failed to parse response' };
  }
}


