// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SubscriptionManager.sol";
import "./TruthToken.sol";
import "./interface/IEZKLVerifier.sol";

// Verification response structure with both proof and news verification status
struct NewsVerificationResponse {
    uint256 requestId;
    string contentHash;
    bool isProofVerified;    // Whether the ZK proof is valid
    bool binaryDecision;     // Whether the news content is verified as true
    bytes proof;
    uint256[] pubInputs;
}

contract PolkaNews is Ownable {
    TruthToken public truthToken;
    SubscriptionManager public subscriptionManager;
    address public verifier;

    // Request ID counter (from RiskConsumer)
    uint256 public nextRequestId;

    struct NewsArticle {
        uint256 requestId;
        string contentHash;
        address reporter;
        uint256 timestamp;
    }

    // Array to store all news articles
    NewsArticle[] public newsArticles;
    
    // Mapping by request ID (primary storage)
    mapping(uint256 => NewsArticle) public newsByRequestId;
    
    // Mapping for verification responses (from RiskConsumer)
    mapping(uint256 => NewsVerificationResponse) public verificationResponses;
    
    // Mapping to store reporter status
    mapping(address => bool) public reporters;

    // Events
    event NewsSubmitted(uint256 indexed requestId, string indexed contentHash, address indexed reporter);
    event NewsVerified(uint256 indexed requestId, string indexed contentHash, bool isVerified);
    event ReporterRegistered(address indexed reporter);
    event ReporterRemoved(address indexed reporter);
    event VerifierUpdated(address indexed newVerifier);

    constructor(
        address _truthToken,
        address _subscriptionManager
    ) Ownable(msg.sender) {
        truthToken = TruthToken(_truthToken);
        subscriptionManager = SubscriptionManager(_subscriptionManager);
        nextRequestId = 1;
    }

    // Register as a reporter (anyone can call for themselves)
    function registerReporter() external {
        require(msg.sender != address(0), "Invalid reporter address");
        require(!reporters[msg.sender], "Reporter already registered");
        reporters[msg.sender] = true;
        emit ReporterRegistered(msg.sender);
    }

    // Submit news (only registered reporters) - generates request ID
    function submitNews(string calldata contentHash) external returns (uint256) {
        require(reporters[msg.sender], "Not a registered reporter");
        
        uint256 requestId = nextRequestId++;

        NewsArticle memory article = NewsArticle({
            requestId: requestId,
            contentHash: contentHash,
            reporter: msg.sender,
            timestamp: block.timestamp
        });

        newsArticles.push(article);
        newsByRequestId[requestId] = article;

        emit NewsSubmitted(requestId, contentHash, msg.sender);
        return requestId;
    }

    // Submit verification response (from RiskConsumer pattern)
    function submitVerificationResponse(
        NewsVerificationResponse calldata response
    ) external {
        require(newsByRequestId[response.requestId].requestId != 0, "Request not found");
        require(verificationResponses[response.requestId].requestId == 0, "Response already submitted");
        
        // Store verification response
        verificationResponses[response.requestId] = response;
        
        // Mint tokens to reporter if both proof and news are verified
        if (response.isProofVerified && response.binaryDecision) {
            address reporter = newsByRequestId[response.requestId].reporter;
            truthToken.mintReward(reporter);
        }

        emit NewsVerified(response.requestId, response.contentHash, response.binaryDecision);
    }

    // Check if news is verified (both proof and content)
    function binaryDecision(uint256 requestId) public view returns (bool) {
        NewsVerificationResponse memory response = verificationResponses[requestId];
        return response.requestId != 0 && response.binaryDecision;
    }

    function isProofVerified(uint256 requestId) public view returns (bool) {
        NewsVerificationResponse memory response = verificationResponses[requestId];
        return response.requestId != 0 && response.isProofVerified;
    }

    // Check if news has verification response
    function hasVerificationResponse(uint256 requestId) public view returns (bool) {
        return verificationResponses[requestId].requestId != 0;
    }

    // Get verification response (from RiskConsumer)
    function getVerificationResponse(uint256 requestId) external view returns (NewsVerificationResponse memory) {
        return verificationResponses[requestId];
    }

    // Get news article details by request ID
    function getNewsByRequestId(uint256 requestId) external view returns (
        uint256 requestId_,
        string memory contentHash,
        address reporter,
        uint256 timestamp,
        bool isVerified,
        bool hasResponse
    ) {
        NewsArticle memory news = newsByRequestId[requestId];
        require(news.requestId != 0, "Request not found");
        return (
            news.requestId,
            news.contentHash,
            news.reporter,
            news.timestamp,
            binaryDecision(requestId),
            hasVerificationResponse(requestId)
        );
    }

    // Get all news articles with verification status
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

    // Remove reporter (only owner)
    function removeReporter(address reporter) external onlyOwner {
        require(reporters[reporter], "Not a registered reporter");
        reporters[reporter] = false;
        emit ReporterRemoved(reporter);
    }

    // Check if address is a reporter
    function isReporter(address reporter) external view returns (bool) {
        return reporters[reporter];
    }

    // Set verifier address (only owner)
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    // Get verifier address
    function getVerifier() external view returns (address) {
        return verifier;
    }
} 