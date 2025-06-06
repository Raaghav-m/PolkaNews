// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SubscriptionManager.sol";
import "./TruthToken.sol";

contract PolkaNews is Ownable {
    TruthToken public truthToken;
    SubscriptionManager public subscriptionManager;
    address public oracle;

    struct NewsArticle {
        string contentHash;
        address reporter;
        uint256 timestamp;
        bool isVerified;
    }

    // Array to store all news articles
    NewsArticle[] public newsArticles;
    // Mapping to store news articles by content hash
    mapping(string => NewsArticle) public newsByHash;
    // Mapping to store reporter status
    mapping(address => bool) public reporters;

    // Events
    event NewsSubmitted(string indexed contentHash, address indexed reporter);
    event NewsVerified(string indexed contentHash, bool isVerified);
    event ReporterRegistered(address indexed reporter);
    event OracleUpdated(address indexed newOracle);

    constructor(
        address _truthToken,
        address _subscriptionManager
    ) Ownable(msg.sender) {
        truthToken = TruthToken(_truthToken);
        subscriptionManager = SubscriptionManager(_subscriptionManager);
    }

    // Register as a reporter (anyone can call for themselves)
    function registerReporter() external {
        require(msg.sender != address(0), "Invalid reporter address");
        require(!reporters[msg.sender], "Reporter already registered");
        reporters[msg.sender] = true;
        emit ReporterRegistered(msg.sender);
    }

    // Submit news (only registered reporters)
    function submitNews(string calldata contentHash) external {
        require(reporters[msg.sender], "Not a registered reporter");
        require(newsByHash[contentHash].reporter == address(0), "News already submitted");

        NewsArticle memory article = NewsArticle({
            contentHash: contentHash,
            reporter: msg.sender,
            timestamp: block.timestamp,
            isVerified: false
        });

        newsArticles.push(article);
        newsByHash[contentHash] = article;

        emit NewsSubmitted(contentHash, msg.sender);
    }

    // Verify news (only oracle)
    function verifyNews(string calldata contentHash, bool isVerified) external {
        require(msg.sender == oracle, "Only oracle can verify");
        require(newsByHash[contentHash].reporter != address(0), "News not found");
        require(!newsByHash[contentHash].isVerified, "Already verified");

        newsByHash[contentHash].isVerified = isVerified;
        
        // Mint tokens to reporter if news is verified
        if (isVerified) {
            address reporter = newsByHash[contentHash].reporter;
            truthToken.mintReward(reporter);
        }

        emit NewsVerified(contentHash, isVerified);
    }

    // View news article
    function viewNews(string calldata contentHash) external {
        require(newsByHash[contentHash].reporter != address(0), "News not found");
        require(newsByHash[contentHash].isVerified, "News not verified");
        require(subscriptionManager.isSubscribed(msg.sender), "Subscription required");

        // Mint tokens to reporter for view
        address reporter = newsByHash[contentHash].reporter;
        truthToken.mintReward(reporter);
    }

    // Get news article details
    function getNewsByHash(string calldata contentHash) external view returns (
        string memory contentHash_,
        address reporter,
        bool isVerified,
        uint256 timestamp
    ) {
        NewsArticle memory news = newsByHash[contentHash];
        return (
            news.contentHash,
            news.reporter,
            news.isVerified,
            news.timestamp
        );
    }

    // Get all news articles
    function getAllNews() external view returns (NewsArticle[] memory) {
        return newsArticles;
    }

    // Get paginated news articles
    function getNewsArticles(uint256 startIndex, uint256 count) external view returns (NewsArticle[] memory) {
        require(startIndex < newsArticles.length, "Start index out of bounds");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > newsArticles.length) {
            endIndex = newsArticles.length;
        }

        uint256 resultCount = endIndex - startIndex;
        NewsArticle[] memory result = new NewsArticle[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = newsArticles[startIndex + i];
        }

        return result;
    }

    // Get total number of news articles
    function getNewsCount() external view returns (uint256) {
        return newsArticles.length;
    }

    // Register reporter (only owner)
    function registerReporter(address reporter) external onlyOwner {
        reporters[reporter] = true;
        emit ReporterRegistered(reporter);
    }

    // Set oracle address (only owner)
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }
} 