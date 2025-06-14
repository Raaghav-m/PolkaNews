// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEZKLVerifier {
    function verifyProof(
        bytes calldata proof,
        uint256[] calldata instances
    ) external pure returns (bool);
}
