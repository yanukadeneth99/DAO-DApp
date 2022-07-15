import { BigNumber, Contract, providers, utils } from "ethers";
import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import {
  DAO_CONTRACT_ABI,
  DAO_CONTRACT_ADDRESS,
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
} from "../constants/index";
import Web3Modal from "web3modal";

import BGImage from "../public/wallpaper.jpg";

const Home: NextPage = () => {
  const [owner, setOwner] = useState(false);
  const [treasuryBalance, setTreasuryBalance] = useState<string>("");
  const [numProposals, setNumProposals] = useState("0");
  const [proposals, setProposals] = useState([]);
  const [nftBalance, setNftBalance] = useState<number>(0);
  const [fakeNftTokenId, setfakeNftTokenId] = useState("");
  const [selectedTab, setSelectedTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef<any>();

  // Connecting Wallet run as soon as the page loads
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  // Function to get Provider/Signer
  const getProviderOrSigner = async (needSigner = false) => {
    try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = await new providers.Web3Provider(provider);

      const { chainId } = await web3Provider.getNetwork();
      if (chainId !== 4) {
        window.alert("Change network to Rinkeby");
        throw new Error("Change Network to Rinkeby");
      }
      if (needSigner) {
        return web3Provider.getSigner();
      }
      return web3Provider;
    } catch (error) {
      console.error(error);
    }
  };

  // Getting Eth balance in the DAO Contract
  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider?.getBalance(DAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance?.toString() as string);
    } catch (error) {
      console.error(error);
    }
  };

  // Get NumProposals in DAO Contract
  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = await getDAOContractInstance(
        provider as providers.Web3Provider
      );
      const daoNumProposals: BigNumber = await daoContract?.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (error) {
      console.error(error);
    }
  };

  // Returns Ether.Contract of DAO. Can send provider or signer
  const getDAOContractInstance = async (
    providerOrSigner: providers.Web3Provider | providers.JsonRpcSigner
  ) => {
    try {
      return await new Contract(
        DAO_CONTRACT_ADDRESS,
        DAO_CONTRACT_ABI,
        providerOrSigner
      );
    } catch (error) {
      console.error(error);
    }
  };

  // Gets the Balance of NFTs from the connected wallet address
  const getUserNFTBalance = async () => {
    try {
      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const nftContract: Contract = (await getNFTContractInstance(
        signer as providers.JsonRpcSigner
      )) as Contract;
      const balance: BigNumber = await nftContract.balanceOf(
        signer.getAddress()
      );
      setNftBalance(parseInt(balance.toString()));
    } catch (error) {
      console.error(error);
    }
  };

  // Returns Ethers.Contract Instance of NFT Contract
  const getNFTContractInstance = async (
    providerOrSigner: providers.Web3Provider | providers.JsonRpcSigner
  ) => {
    try {
      return await new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        providerOrSigner
      );
    } catch (error) {
      console.error(error);
    }
  };

  // Create a Proposal with the fake token ID
  const createProposal = async () => {
    try {
      setLoading(true);
      await getUserNFTBalance();

      if (nftBalance < 1) {
        window.alert("You need a NFT To Create Proposal");
        throw new Error("You need a NFT to Create Proposal");
      }

      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const daoContract: Contract = (await getDAOContractInstance(
        signer
      )) as Contract;

      const tx = await daoContract.createProposal(fakeNftTokenId);
      await tx.wait();
      window.alert("Created a Proposal");
      await getNumProposalsInDAO();
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  // Fetch one Proposal Object by ID
  const fetchProposalByID = async (id: number) => {
    try {
      const provider = (await getProviderOrSigner()) as providers.Web3Provider;
      const daoContract = (await getDAOContractInstance(provider)) as Contract;
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (error) {
      console.log(error);
    }
  };

  // Loops over all proposals and gets them
  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for (let i = 0; i < parseInt(numProposals); i++) {
        const proposal = await fetchProposalByID(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
    }
  };

  // User Votes on a Proposal
  const voteOnProposal = async (proposalId: BigNumber, _vote: string) => {
    try {
      setLoading(true);
      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const daoContract = (await getDAOContractInstance(signer)) as Contract;
      const vote = _vote == "YAY" ? 0 : _vote == "NAY" ? 1 : 5;
      const tx = await daoContract.voteOnProposal(proposalId, vote);
      await tx.wait();
      await fetchAllProposals();
      setLoading(false);
      window.alert("Voted Succesfully!");
    } catch (error: Error | any) {
      console.error(error);
      setLoading(false);
      window.alert(error?.data?.message);
    }
  };

  const executeProposal = async (proposalId: BigNumber) => {
    try {
      setLoading(true);
      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const daoContract = (await getDAOContractInstance(signer)) as Contract;
      const tx = await daoContract.executeProposal(proposalId);
      await tx.wait();
      setLoading(false);
      await fetchAllProposals();
      window.alert("Executed Proposal Succesfully");
    } catch (error: Error | any) {
      console.error(error);
      setLoading(false);
      window.alert(error?.data?.message);
    }
  };

  // Withdraw all ether from DAO Contract
  const withdrawEther = async () => {
    try {
      setLoading(true);
      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const daoContract = (await getDAOContractInstance(signer)) as Contract;
      const tx = await daoContract.withdrawEther();
      await tx.wait();
      window.alert("All funds pulled");
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  // Get if you are owner
  const getOwner = async () => {
    try {
      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const daoContract = (await getDAOContractInstance(signer)) as Contract;
      const ownerAD = await daoContract.owner();
      console.log(ownerAD);
      const sigAd = (await signer.getAddress()).toString();
      if (sigAd == ownerAD) {
        setOwner(true);
        window.alert("You are owner");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Triggers Connect Wallet when page loads
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
    }

    connectWallet().then(async () => {
      await getDAOTreasuryBalance();
      await getUserNFTBalance();
      await getNumProposalsInDAO();
      await getOwner();
    });
  }, [walletConnected]);

  // Fills all Proposals when Tabs are changed
  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);

  // Renders tabs based on what users clicks
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return (
        <div className="absolute bg-gray-800/10 shadow-2xl backdrop-blur-xl text-gray-300 border-2 border-gray-800/70 w-1/2 h-1/2 flex flex-col p-8 justify-start items-center space-y-5">
          {renderCreateProposalTab()}
          <button
            onClick={() => setSelectedTab("close")}
            className="text-gray-300 p-4 bg-gray-800/50 rounded-3xl hover:bg-gray-900 hover:text-gray-200 hover:scale-105"
          >
            Close
          </button>
        </div>
      );
    } else if (selectedTab === "View Proposals") {
      return (
        <div className="absolute bg-gray-800/10 shadow-2xl backdrop-blur-xl text-gray-300 border-2 border-gray-800/70 w-1/2 h-1/2 overflow-scroll flex flex-col p-8 justify-start items-center space-y-5">
          {renderViewProposalsTab()}
          <button
            onClick={() => setSelectedTab("close")}
            className="text-gray-300 p-4 bg-gray-800/50 rounded-3xl hover:bg-gray-900 hover:text-gray-200 hover:scale-105"
          >
            Close
          </button>
        </div>
      );
    }
    return null;
  }

  // Create Proposal Tab
  function renderCreateProposalTab() {
    if (loading) {
      return <div>Loading..</div>;
    } else if (nftBalance === 0) {
      return <div>You don&apos;t own any NFTS</div>;
    } else {
      return (
        <div>
          <label>Fake NFT Token ID to Purchase: </label>
          <input
            placeholder="0"
            type="number"
            onChange={(e) => setfakeNftTokenId(e.target.value)}
          />
          <button onClick={createProposal}>Create</button>
        </div>
      );
    }
  }

  function renderViewProposalsTab() {
    if (loading) {
      return <div>Loading...</div>;
    } else if (proposals.length === 0) {
      return <div>No proposals have been created</div>;
    } else {
      return (
        <div className="flex flex-col justify-center items-center space-y-10">
          {proposals.map((p: any, index: number) => (
            <div key={index}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className="p-4 flex flex-row space-x-6">
                  <button
                    className="p-4 bg-gray-800"
                    onClick={() => voteOnProposal(p.proposalId, "YAY")}
                  >
                    Vote YAY
                  </button>
                  <button
                    className="p-4 bg-gray-800"
                    onClick={() => voteOnProposal(p.proposalId, "NAY")}
                  >
                    Vote NAY
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div>
                  <button
                    className="p-4 bg-gray-800"
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                  </button>
                </div>
              ) : (
                <div>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>DAO</title>
        <meta name="description" content="DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div>
        <div
          className="flex flex-col justify-start pt-24 space-y-9 items-center w-screen h-screen"
          style={{ background: `url(${BGImage.src})`, backgroundSize: "cover" }}
        >
          <h1 className="w-full text-center text-5xl font-bold uppercase text-gray-300 backdrop-blur-lg shadow-xl py-6">
            Welcome to DAO
          </h1>
          <div className="text-xl text-gray-300 p-12 backdrop-blur-lg flex flex-col justify-center items-center space-y-4 shadow-sm border-4 border-spacing-2 border-gray-800/30">
            <h1>Your Meme NFT Balance: {nftBalance.toString()}</h1>
            <h1>
              Treasury Balance: {utils.formatEther(treasuryBalance || 0)} ETH
            </h1>
            <h1>Total Number of Proposals: {numProposals}</h1>
          </div>
          <div className="flex flex-row p-6 px-12 bg-gray-800/30 space-x-6 shadow-md backdrop-blur-xl text-xl text-gray-300">
            <button
              className="p-6 bg-gray-800 rounded-3xl hover:bg-gray-900 hover:text-gray-200 hover:scale-105"
              onClick={() => setSelectedTab("Create Proposal")}
            >
              Create Proposal
            </button>
            <button
              className="p-6 bg-gray-800 rounded-3xl hover:bg-gray-900 hover:text-gray-200 hover:scale-105"
              onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
          </div>
          {renderTabs()}

          {owner && (
            <div>
              <button
                onClick={withdrawEther}
                className="p-6 bg-gray-800 rounded-3xl hover:bg-gray-900 hover:text-gray-200 hover:scale-105"
              >
                Withdraw Eth
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
