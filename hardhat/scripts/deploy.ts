import { ethers } from "hardhat";
import { MEMENFT_CONTRACT_ADDRESS } from "../constants/index";

async function main() {
  const FakeMarket = await ethers.getContractFactory("FakeNFTMarketplace");
  const fakemarket = await FakeMarket.deploy();

  await fakemarket.deployed();

  console.log("Fake Market Deployed to : ", fakemarket.address);

  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(MEMENFT_CONTRACT_ADDRESS, fakemarket.address, {
    value: ethers.utils.parseEther("1"),
  });

  await dao.deployed();

  console.log("DAO Deployed on Address : ", dao.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
