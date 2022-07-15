//SPDX-License-Identifier:MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IFakeNFTMarketplace.sol";
import "./IMemeNFT.sol";

///@title DAO for Memes
///@author Yanuka Deneth
contract DAO is Ownable {
    ///@dev Datatype which contains all about a proposal
    struct Proposal {
        ///@dev The Token ID of the NFT to purchase from the fakeNFTMarketplace if proposal passes
        uint256 nftTokenId;
        ///@dev Active Timestamp of deadline. Cannot vote after it ends, but only can execute after ended.
        uint256 deadline;
        ///@dev Positive Votes
        uint256 yayVotes;
        ///@dev Negative Votes
        uint256 nayVotes;
        ///@dev Check if this proposal is executed. Cannot execute before deadline
        bool executed;
        ///@dev Mapping of Meme NFT tokens to whether they voted.
        mapping(uint256 => bool) voters;
    }

    ///@dev ID to Proposals
    mapping(uint256 => Proposal) public proposals;
    ///@dev Number of Proposals done
    uint256 public numProposals;

    ///@dev Interface for Fake Marketplace
    IFakeNFTMarketplace nftmarketplace;
    ///@dev Interface for Meme NFT
    IMemeNFT memenft;

    ///@dev Pass some ether when creating
    ///@param memenftaddress Address of the Meme NFT Contract Deployed
    ///@param fakenftmarketaddress Address of the FakeNFT Marketplace Contract Deployed
    constructor(address memenftaddress, address fakenftmarketaddress) payable {
        memenft = IMemeNFT(memenftaddress);
        nftmarketplace = IFakeNFTMarketplace(fakenftmarketaddress);
    }

    ///@dev Yes-0, and No-1
    enum Vote {
        YAY, //Yes - 0
        NAY //No - 1
    }

    ///@dev Use this modifier in functions to make sure the caller address has NFT tokens.
    modifier nftHolderOnly() {
        require(memenft.balanceOf(msg.sender) > 0, "Not a DAO Member");
        _;
    }

    ///@dev Modifier to Vote on proposal, not exceeded deadline.
    ///@param proposalIndex Index of the Proposal.
    modifier activeProposalOnly(uint256 proposalIndex) {
        require(proposalIndex <= numProposals, "Proposal Does not Exist");
        require(
            proposals[proposalIndex].deadline > block.timestamp,
            "Deadline Exceeded"
        );
        _;
    }

    ///@dev Modifier to check proposal is not executed and past deadline
    ///@param proposalIndex Index of the Proposal.
    modifier inactiveProposalOnly(uint256 proposalIndex) {
        require(proposalIndex <= numProposals, "Proposal Does not Exist");
        require(
            proposals[proposalIndex].deadline <= block.timestamp,
            "Deadline Not Exceeded"
        );
        require(
            proposals[proposalIndex].executed == false,
            "Proposal Already Excecuted"
        );
        _;
    }

    ///@notice Used to Create Proposals
    ///@param _nftTokenId Enter the NFT Token ID to purchase
    ///@return Returns the Proposal ID, newly created.
    function createProposal(uint256 _nftTokenId)
        external
        nftHolderOnly
        returns (uint256)
    {
        require(nftmarketplace.available(_nftTokenId), "NFT Already purchased");
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        proposal.deadline = block.timestamp + 30 minutes;
        return numProposals++;
    }

    ///@dev Vote on the Proposal, Must not exceed deadline and must contain NFTs.
    ///@param proposalIndex The Proposal Number ID
    ///@param vote Vote Enum to check if it's a YES or NO
    function voteOnProposal(uint256 proposalIndex, Vote vote)
        external
        nftHolderOnly
        activeProposalOnly(proposalIndex)
    {
        Proposal storage proposal = proposals[proposalIndex];

        uint256 voterNFTBalance = memenft.balanceOf(msg.sender);
        uint256 numVotes = 0;

        for (uint256 i = 0; i < voterNFTBalance; i++) {
            uint256 tokenId = memenft.tokenOfOwnerByIndex(msg.sender, i);
            if (proposal.voters[tokenId] == false) {
                numVotes++;
                proposal.voters[tokenId] = true;
            }
        }
        require(numVotes > 0, "Already Voted");

        if (vote == Vote.YAY) {
            proposal.yayVotes += numVotes;
        } else if (vote == Vote.NAY) {
            proposal.nayVotes += numVotes;
        } else {
            require(true, "Error with Voting Entry");
        }
    }

    ///@dev Execute Proposal if deadline is exceeded. Purchase NFT if proposal has high yes votes.
    ///@param proposalIndex The Proposal ID
    function executeProposal(uint256 proposalIndex)
        external
        nftHolderOnly
        inactiveProposalOnly(proposalIndex)
    {
        Proposal storage proposal = proposals[proposalIndex];

        if (proposal.yayVotes > proposal.nayVotes) {
            uint256 nftPrice = nftmarketplace.getPrice();
            require(
                address(this).balance >= nftPrice,
                "Not enough Eth to purchase NFT"
            );
            require(
                nftmarketplace.available(proposal.nftTokenId),
                "NFT Already Purchased!"
            );
            nftmarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }

        proposal.executed = true;
    }

    ///@dev Withdraw all funds from the smart contract
    function withdrawEther() public onlyOwner {
        uint256 amount = address(this).balance;
        address payable owner = payable(owner());
        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Error Sending Ether");
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}
}
