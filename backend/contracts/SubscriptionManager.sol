// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Sources.sol";
import "./TruthToken.sol";

contract SubscriptionManager is Ownable {
    IERC20 public truthToken;
    Sources public sources;
    uint256 public subscriptionFee;
    uint256 public subscriptionDuration;
    uint256 public constant REWARD_PER_SUBSCRIPTION = 3 * 10**18; // 3 tokens

    struct Subscription {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }

    mapping(address => Subscription) public subscriptions;

    event SubscriptionPurchased(address indexed subscriber, uint256 startTime, uint256 endTime);
    event SubscriptionFeeUpdated(uint256 newFee);
    event SubscriptionDurationUpdated(uint256 newDuration);
    event SourcesContractUpdated(address indexed newSources);

    constructor(
        address _truthToken,
        address _sources,
        uint256 _subscriptionFee,
        uint256 _subscriptionDuration
    ) Ownable(msg.sender) {
        truthToken = IERC20(_truthToken);
        sources = Sources(_sources);
        subscriptionFee = _subscriptionFee;
        subscriptionDuration = _subscriptionDuration;
    }

    function purchaseSubscription() external {
        require(!isSubscribed(msg.sender), "Already subscribed");
        
        // Transfer tokens from user to contract
        require(
            truthToken.transferFrom(msg.sender, address(this), subscriptionFee),
            "Token transfer failed"
        );

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + subscriptionDuration;

        subscriptions[msg.sender] = Subscription({
            startTime: startTime,
            endTime: endTime,
            isActive: true
        });

        // Transfer reward tokens to TruthToken contract
        require(
            truthToken.transfer(address(truthToken), REWARD_PER_SUBSCRIPTION),
            "Reward transfer failed"
        );

        // Distribute rewards to sources
        sources.distributeRewards();

        emit SubscriptionPurchased(msg.sender, startTime, endTime);
    }

    function isSubscribed(address user) public view returns (bool) {
        Subscription memory sub = subscriptions[user];
        return sub.isActive && block.timestamp <= sub.endTime;
    }

    function getSubscriptionDetails(address user) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool isActive
    ) {
        Subscription memory sub = subscriptions[user];
        return (sub.startTime, sub.endTime, sub.isActive);
    }

    function setSubscriptionFee(uint256 _newFee) external onlyOwner {
        subscriptionFee = _newFee;
        emit SubscriptionFeeUpdated(_newFee);
    }

    function setSubscriptionDuration(uint256 _newDuration) external onlyOwner {
        subscriptionDuration = _newDuration;
        emit SubscriptionDurationUpdated(_newDuration);
    }

    function setSources(address _sources) external onlyOwner {
        require(_sources != address(0), "Invalid sources address");
        sources = Sources(_sources);
        emit SourcesContractUpdated(_sources);
    }

    function withdrawTokens() external onlyOwner {
        uint256 balance = truthToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(truthToken.transfer(owner(), balance), "Transfer failed");
    }
} 