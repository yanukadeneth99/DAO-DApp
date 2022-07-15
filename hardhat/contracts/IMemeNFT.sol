//SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

interface IMemeNFT {
    ///@dev Finds the number of NFT owns by the address.
    ///@param owner Send the address of the person you want to check
    ///@return unint256 Returns the balance of the owner. 0 is nothing purchased
    function balanceOf(address owner) external view returns (uint256);

    ///@dev Get the NFT token ID of the adress by given index
    ///@param owner Send the address of the person you want to check
    ///@param index Send the index. 0 to begin, and 1 for the next, if person has more.
    ///@return unint256 Returns the token ID if it exits.
    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256);
}
