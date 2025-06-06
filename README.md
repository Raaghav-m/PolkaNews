# 📰 PolkaNews — A Credibility-First News Platform

PolkaNews is a decentralized news platform where reporters are rewarded for publishing truthful content. It uses an AI-based oracle to verify the authenticity of news submissions and mints on-chain rewards (TruthTokens) for verified content.

---

## 🌐 Why Polkadot AssetHub?

We chose **Polkadot's AssetHub** for its:

- **EVM compatibility**: Seamless deployment of Solidity contracts using PolkaVM.
- **Low gas fees**: Cost-effective transaction execution for a high-frequency app like news publishing.
- **Interoperability**: Opens up future integration with other parachains and data layers.
- **Native asset support**: Makes reward distribution and fee mechanics more efficient via native token standards.

---

## 🛠️ Features of AssetHub that Enable PolkaNews

- ✅ Smart contract support via **PolkaVM**
- ✅ **Native assets** creation and transfer
- ✅ **Custom fee structures** for fine-grained control
- ✅ Support for **event-based off-chain triggers**
- ✅ Bridges and **XCMP-ready** for future composability

---

## 🔗 Project Links

- 🧠 **Frontend GitHub**: [PolkaNews Frontend](https://github.com/Raaghav-m/PolkaNews)
- 🔐 **Smart Contract GitHub**: [PolkaNews Contracts](https://github.com/Raaghav-m/PolkaNews/contracts)
- 🧪 **Deployed Contract Addresses (AssetHub Testnet)**:
  - `TruthToken`: `0x4437F9F98613A0269d7b37D35a37025D8e240881`
  - `SubscriptionManager`: `0x0aAFC279D67297BeF1cB717d51342EdBDA266798`
  - `PolkaNews`: `0x74863B9AAECCB34238FA5f607B03242ddc62e1aF`

---

## 💻 How to Run Locally

### 🧱 Prerequisites

- Node.js + npm
- Hardhat
- Git
- A local HTTP RPC URL or Polkadot AssetHub testnet endpoint

### 📦 Installation

```bash
git clone https://github.com/Raaghav-m/PolkaNews
cd PolkaNews
Frontend
bash
cd frontend
npm install
npm run dev
```
Backend (New Terminal)
```bash
cd server
npm install
node script.js
```
🔐 Environment Variables
Make sure to create a .env file in both the frontend/ and server/ directories.

frontend/.env
```env
NEXT_PUBLIC_TRUTH_TOKEN_ADDRESS=0x4437F9F98613A0269d7b37D35a37025D8e240881
NEXT_PUBLIC_POLKANEWS_ADDRESS=0x74863B9AAECCB34238FA5f607B03242ddc62e1aF
NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=0x0aAFC279D67297BeF1cB717d51342EdBDA266798
NEXT_PUBLIC_PINATA_API_KEY=<pinata_api_key>
NEXT_PUBLIC_PINATA_SECRET=<pinata_api_secret>
```
server/.env

```env
ORACLE_PRIVATE_KEY=<oracle_private_key>
OPENAI_API_KEY=<openai_api_key>
PINATA_API_KEY=<pinata_api_key>
PINATA_SECRET_KEY=<pinata_api_secret>
RPC_URL=https://testnet-passet-hub-eth-rpc.polkadot.io
POLKANEWS_ADDRESS=0x815F645cc9090CB289AA6653a02Dc0Bcac10a13E
```
🚀 **Future Improvements (Phase 2)**

-🧠 Integrate ZK-based proofs for oracle validation

-🗳 Implement community-based upvote/downvote system

-🛰 Enable news cross-posting across parachains using XCMP

-📲 Add reporter and user reputation scores on-chain

🙌 **Credits**

-💻 Developed by Raaghav Manivel

-🧠 AI Oracle powered by OpenAI's GPT-4

-⚙️ Built during the Polkadot AssetHub Hackathon

-📷 UI/UX inspired by decentralized publishing tools


