// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TruthToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PolkaNews is Ownable {
    TruthToken public truthToken;
    
    // Structure for news articles
    struct NewsArticle {
        bytes32 contentHash;    // Hash of the news content
        address reporter;       // Address of the reporter
        bool isVerified;       // Verification status
        uint256 timestamp;     // Submission timestamp
    }

    // Mapping of registered reporters
    mapping(address => bool) public isReporter;
    
    // Mapping of news articles by their content hash
    mapping(bytes32 => NewsArticle) public newsArticles;
    
    // Oracle address that will verify the news
    address public oracle;
    
    // Events
    event ReporterRegistered(address indexed reporter);
    event NewsSubmitted(bytes32 indexed contentHash, address indexed reporter);
    event NewsVerified(bytes32 indexed contentHash, bool verified);
    event OracleUpdated(address indexed newOracle);
    
    // Modifiers
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call this");
        _;
    }
    
    modifier onlyReporter() {
        require(isReporter[msg.sender], "Only registered reporters can call this");
        _;
    }
     
    constructor(address _truthToken) Ownable(msg.sender) {
        require(_truthToken != address(0), "Invalid token address");
        truthToken = TruthToken(_truthToken);
    }
    
    // Set the oracle address
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }
    
    // Register a new reporter
    function registerReporter(address reporter) external onlyOwner {
        require(reporter != address(0), "Invalid reporter address");
        require(!isReporter[reporter], "Reporter already registered");
        isReporter[reporter] = true;
        emit ReporterRegistered(reporter);
    }
    
    // Submit news article
    function submitNews(bytes32 _contentHash) external onlyReporter {
        require(_contentHash != bytes32(0), "Invalid content hash");
        require(newsArticles[_contentHash].timestamp == 0, "News already submitted");
        
        newsArticles[_contentHash] = NewsArticle({
            contentHash: _contentHash,
            reporter: msg.sender,
            isVerified: false,
            timestamp: block.timestamp
        });
        
        emit NewsSubmitted(_contentHash, msg.sender);
    }
    
    // Verify news article (called by oracle)
    function verifyNews(bytes32 _contentHash, bool _verified) external onlyOracle {
        require(_contentHash != bytes32(0), "Invalid content hash");
        NewsArticle storage article = newsArticles[_contentHash];
        require(article.timestamp != 0, "News does not exist");
        require(!article.isVerified, "News already verified");
        
        article.isVerified = true;
        
        if (_verified) {
            // Mint reward tokens to the reporter
            truthToken.mintReward(article.reporter);
        }
        
        emit NewsVerified(_contentHash, _verified);
    }
}