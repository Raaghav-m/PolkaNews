require('dotenv').config();
const { ethers } = require('hardhat');
const pinataSDK = require('@pinata/sdk');
const PolkaNewsABI = require('../artifacts-pvm/contracts/PolkaNews.sol/PolkaNews.json').abi;

// Pinata configuration
const pinata = new pinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_SECRET_KEY
);

// Contract addresses from deployment
const POLKANEWS_ADDRESS = '0xFc43D3C0C227E5De166B9061Bd13493C2e378Ed5';
const TRUTHTOKEN_ADDRESS = '0x2f7F296F9f269Ede14bc99CCf35F9Fb0EC3B56b6';

async function uploadAndSubmitNews(newsContent, signer) {
    try {
        // Prepare metadata for Pinata
        const options = {
            pinataMetadata: {
                name: `PolkaNews_${Date.now()}`,
                keyvalues: {
                    title: newsContent.title,
                    timestamp: newsContent.timestamp
                }
            },
            pinataOptions: { 
                cidVersion: 1 
            }
        };

        // Upload to IPFS through Pinata
        console.log('\nUploading news to IPFS via Pinata...');
        const result = await pinata.pinJSONToIPFS(newsContent, options);
        const ipfsHash = result.IpfsHash;
        console.log('Successfully uploaded to IPFS with hash:', ipfsHash);

        // Get contract instance with full ABI
        const polkaNews = new ethers.Contract(
            POLKANEWS_ADDRESS,
            PolkaNewsABI,
            signer
        );

        // Check if reporter is registered
        const isRegistered = await polkaNews.isReporter(signer.address);
        if (!isRegistered) {
            console.log('\nRegistering as reporter...');
            const registerTx = await polkaNews.registerReporter(signer.address);
            await registerTx.wait();
            console.log('Successfully registered as reporter');
        } else {
            console.log('\nAlready registered as reporter');
        }

        // Submit to contract
        console.log(`\nSubmitting news from ${signer.address}`);
        // Convert IPFS hash to bytes32
        const contentHashBytes = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
        const tx = await polkaNews.submitNews(contentHashBytes);
        await tx.wait();
        console.log(`✅ News submission confirmed with IPFS hash: ${ipfsHash}`);
        console.log(`Content hash (bytes32): ${contentHashBytes}`);

        return { ipfsHash, contentHashBytes };
    } catch (error) {
        console.error('Error in upload and submit:', error);
        throw error;
    }
}

async function main() {
    try {
        // Get signer
        const [owner] = await ethers.getSigners();
        console.log('Using address:', owner.address);

        // Prepare news content
        const newsContent = {
            title: "SpaceX Successfully Launches Starship",
            content: `SpaceX has successfully launched its Starship rocket from its facility in Texas. 
            The launch, which took place at 8:30 AM EST, marks a significant milestone in space exploration. 
            The vehicle reached its target altitude of 70 kilometers before executing a controlled descent.
            NASA officials and independent observers have confirmed the success of the mission.
            This achievement brings humanity one step closer to sustainable space travel.`,
            source: "Official SpaceX Press Release",
            timestamp: new Date().toISOString(),
            author: owner.address,
            references: [
                "https://www.spacex.com/launches/",
                "https://www.nasa.gov/news/"
            ]
        };

        // Upload and submit news
        const { ipfsHash, contentHashBytes } = await uploadAndSubmitNews(newsContent, owner);

        // Get contract for event listening
        const polkaNews = new ethers.Contract(
            POLKANEWS_ADDRESS,
            PolkaNewsABI,
            owner
        );

        // Wait for verification
        console.log('\nWaiting for oracle verification...');
        console.log('Please ensure the oracle server is running to process this submission.');
        
        // Listen for the NewsVerified event
        polkaNews.once('NewsVerified', (contentHash, verified) => {
            console.log('\nNews Verification Result:');
            console.log('Content Hash:', contentHash);
            console.log('Verified:', verified);
            process.exit(verified ? 0 : 1);
        });

        // Keep the script running to wait for the event
        console.log('\nListening for verification event...');
        console.log('Content hash to watch for:', contentHashBytes);

    } catch (error) {
        console.error('Error in test flow:', error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

main().catch((error) => {
    console.error(error);
    process.exit(1);
}); 