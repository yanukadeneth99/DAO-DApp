//SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

interface IFakeNFTMarketplace {
    ///@dev Function to Purchase token if not already purchased
    function purchase(uint256 _tokenId) external payable;

    ///@dev Function to get Price of NFT.
    ///@return Returns 0.1 ether
    function getPrice() external pure returns (uint256);

    ///@dev Check if token is not purchased already.
    ///@return True if not purchased, false if it is already purchased
    function available(uint256 _tokenId) external view returns (bool);
}
