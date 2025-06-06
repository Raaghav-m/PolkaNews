// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SubscriptionManager is Ownable {
    IERC20 public truthToken;
    uint256 public subscriptionFee;
    uint256 public subscriptionDuration;

    struct Subscription {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }

    mapping(address => Subscription) public subscriptions;

    event SubscriptionPurchased(address indexed subscriber, uint256 startTime, uint256 endTime);
    event SubscriptionFeeUpdated(uint256 newFee);
    event SubscriptionDurationUpdated(uint256 newDuration);

    constructor(
        address _truthToken,
        uint256 _subscriptionFee,
        uint256 _subscriptionDuration
    ) Ownable(msg.sender) {
        truthToken = IERC20(_truthToken);
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

    function withdrawTokens() external onlyOwner {
        uint256 balance = truthToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(truthToken.transfer(owner(), balance), "Transfer failed");
    }
} 