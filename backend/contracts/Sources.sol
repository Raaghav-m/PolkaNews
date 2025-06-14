// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TruthToken.sol";

contract Sources is Ownable {
    TruthToken public truthToken;
    uint256 public constant STAKE_AMOUNT = 100 * 10**18; // 100 tokens with 18 decimals
    uint256 public constant REWARD_PER_SUBSCRIPTION = 3 * 10**18; // 3 tokens per subscription
    uint256 public stashedTokens;

    struct Source {
        string name;
        address investor;
        bool isActive;
        uint256 stakeAmount;
        uint256 totalRewards;
    }

    // Mapping of source name to Source struct
    mapping(string => Source) public sources;
    // Array to keep track of all sources
    string[] public sourceList;
    // Mapping to track investor's sources
    mapping(address => string[]) public investorSources;
    // Mapping to track investor's total rewards
    mapping(address => uint256) public investorRewards;

    event SourceAdded(string indexed sourceName, address indexed investor);
    event SourceChallenged(string indexed sourceName, address indexed challenger);
    event SourceRemoved(string indexed sourceName, address indexed investor);
    event RewardsDistributed(uint256 totalAmount);
    event RewardsClaimed(address indexed investor, uint256 amount);

    constructor(address _truthToken) Ownable(msg.sender) {
        truthToken = TruthToken(_truthToken);
    }

    // Function to stake tokens and add a source
    function addSource(string calldata sourceName) external {
        require(!sources[sourceName].isActive, "Source already exists");
        
        // Transfer tokens from user to contract
        require(truthToken.transferFrom(msg.sender, address(this), STAKE_AMOUNT), "Transfer failed");

        sources[sourceName] = Source({
            name: sourceName,
            investor: msg.sender,
            isActive: true,
            stakeAmount: STAKE_AMOUNT,
            totalRewards: 0
        });

        sourceList.push(sourceName);
        investorSources[msg.sender].push(sourceName);

        emit SourceAdded(sourceName, msg.sender);
    }

    // Function to challenge a source
    function challengeSource(string calldata sourceName) external {
        require(sources[sourceName].isActive, "Source not found or inactive");
        require(msg.sender != sources[sourceName].investor, "Cannot challenge own source");

        // Here you would implement the verification logic
        // For now, we'll just remove the source as an example
        _removeSource(sourceName);
        
        emit SourceChallenged(sourceName, msg.sender);
    }

    // Internal function to remove a source
    function _removeSource(string calldata sourceName) internal {
        Source storage source = sources[sourceName];
        source.isActive = false;
        
        // Add staked tokens to stashed amount instead of returning them
        stashedTokens += source.stakeAmount;
        
        // Remove from investor's sources
        string[] storage investorSourceList = investorSources[source.investor];
        for (uint i = 0; i < investorSourceList.length; i++) {
            if (keccak256(bytes(investorSourceList[i])) == keccak256(bytes(sourceName))) {
                investorSourceList[i] = investorSourceList[investorSourceList.length - 1];
                investorSourceList.pop();
                break;
            }
        }
        
        emit SourceRemoved(sourceName, source.investor);
    }

    // Function to distribute rewards from subscriptions
    function distributeRewards() external {
        uint256 activeInvestorCount = 0;
        address[] memory uniqueInvestors = new address[](sourceList.length);
        bool[] memory seen = new bool[](sourceList.length);

        // Count unique active investors
        for (uint i = 0; i < sourceList.length; i++) {
            if (sources[sourceList[i]].isActive) {
                address investor = sources[sourceList[i]].investor;
                bool isNew = true;
                for (uint j = 0; j < activeInvestorCount; j++) {
                    if (uniqueInvestors[j] == investor) {
                        isNew = false;
                        break;
                    }
                }
                if (isNew) {
                    uniqueInvestors[activeInvestorCount] = investor;
                    activeInvestorCount++;
                }
            }
        }

        require(activeInvestorCount > 0, "No active investors");
        
        uint256 rewardPerInvestor = REWARD_PER_SUBSCRIPTION / activeInvestorCount;
        
        for (uint i = 0; i < activeInvestorCount; i++) {
            address investor = uniqueInvestors[i];
            investorRewards[investor] += rewardPerInvestor;
            
            // Update total rewards for each source of this investor
            string[] storage investorSourceList = investorSources[investor];
            for (uint j = 0; j < investorSourceList.length; j++) {
                if (sources[investorSourceList[j]].isActive) {
                    sources[investorSourceList[j]].totalRewards += rewardPerInvestor;
                }
            }
        }
        
        emit RewardsDistributed(REWARD_PER_SUBSCRIPTION);
    }

    // Function for investors to claim their rewards
    function claimRewards() external {
        uint256 rewards = investorRewards[msg.sender];
        require(rewards > 0, "No rewards to claim");
        
        investorRewards[msg.sender] = 0;
        require(truthToken.transfer(msg.sender, rewards), "Transfer failed");
        
        emit RewardsClaimed(msg.sender, rewards);
    }

    // View function to get all active sources
    function getActiveSources() external view returns (string[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < sourceList.length; i++) {
            if (sources[sourceList[i]].isActive) {
                count++;
            }
        }

        string[] memory activeSources = new string[](count);
        uint256 index = 0;
        for (uint i = 0; i < sourceList.length; i++) {
            if (sources[sourceList[i]].isActive) {
                activeSources[index] = sourceList[i];
                index++;
            }
        }
        return activeSources;
    }

    // View function to get source details
    function getSourceDetails(string calldata sourceName) external view returns (
        string memory name,
        address investor,
        bool isActive,
        uint256 stakeAmount,
        uint256 totalRewards
    ) {
        Source memory source = sources[sourceName];
        return (
            source.name,
            source.investor,
            source.isActive,
            source.stakeAmount,
            source.totalRewards
        );
    }

    // View function to get investor's sources
    function getInvestorSources(address investor) external view returns (string[] memory) {
        return investorSources[investor];
    }

    // View function to get investor's pending rewards
    function getInvestorRewards(address investor) external view returns (uint256) {
        return investorRewards[investor];
    }

    // View function to get total stashed tokens
    function getStashedTokens() external view returns (uint256) {
        return stashedTokens;
    }

    // View function to get total rewards earned by a source
    function getSourceTotalRewards(string calldata sourceName) external view returns (uint256) {
        require(sources[sourceName].investor != address(0), "Source does not exist");
        return sources[sourceName].totalRewards;
    }
} 