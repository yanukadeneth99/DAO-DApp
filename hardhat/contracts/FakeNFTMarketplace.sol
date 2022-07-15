//SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Fake NFT Marketplace for DAO
/// @author Yanuka Deneth
contract FakeNFTMarketplace is Ownable {
    ///@dev Symbolizes NFT Tokens
    mapping(uint256 => address) public tokens;

    ///@notice Purchasing Price for each token
    ///@dev Variable cannot be changed or called anywhere other than in this contract.
    uint256 private constant nftPrice = 0.1 ether;

    ///@dev Only called by external contracts to purchase a token(NFT)
    ///@dev Requires to send sufficient funds and token must not already be purchased
    ///@param _tokenId The fake token ID to purchase
    function purchase(uint256 _tokenId) external payable {
        require(
            msg.value == nftPrice,
            "Insufficient funds. NFT Costs 0.1 ether"
        );
        require(
            tokens[_tokenId] == address(0),
            "This Token is already purchased!"
        );
        tokens[_tokenId] = msg.sender;
    }

    ///@dev Only called by external contracts to get the Price of a token
    ///@return Returns 0.1 ether since it is a constant
    function getPrice() external pure returns (uint256) {
        return nftPrice;
    }

    function available(uint256 _tokenId) external view returns (bool) {
        if (tokens[_tokenId] == address(0)) {
            return true;
        }
        return false;
    }

    ///@dev Used to withdraw ether from account by owner only
    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        address payable owner = payable(owner());
        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Error Sending Ether");
    }

    fallback() external payable {}

    receive() external payable {}
}
