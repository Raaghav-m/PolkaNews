// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TruthToken is ERC20, Ownable {
    // Amount of tokens to mint for each verified news
    uint256 public constant REWARD_AMOUNT = 10 * 10**18; // 10 tokens with 18 decimals
    // Amount of tokens to mint for faucet
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18; // 100 tokens with 18 decimals

    // Address of the PolkaNews contract that can mint rewards
    address public polkaNewsContract;

    // Mapping to track faucet usage
    mapping(address => bool) public hasUsedFaucet;

    // Events
    event PolkaNewsContractUpdated(address indexed newContract);
    event FaucetUsed(address indexed user);

    constructor() ERC20("TruthToken", "TRUTH") Ownable(msg.sender) {}

    modifier onlyPolkaNews() {
        require(msg.sender == polkaNewsContract, "Only PolkaNews contract can mint rewards");
        _;
    }

    // Set or update the PolkaNews contract address
    function setPolkaNewsContract(address _contract) external onlyOwner {
        require(_contract != address(0), "Invalid contract address");
        polkaNewsContract = _contract;
        emit PolkaNewsContractUpdated(_contract);
    }

    // Only the PolkaNews contract will be allowed to mint rewards
    function mintReward(address reporter) external onlyPolkaNews {
        require(reporter != address(0), "Invalid reporter address");
        _mint(reporter, REWARD_AMOUNT);
    }

    // Faucet function to get initial tokens
    function useFaucet() external {
        require(!hasUsedFaucet[msg.sender], "Faucet already used");
        hasUsedFaucet[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetUsed(msg.sender);
    }
} 