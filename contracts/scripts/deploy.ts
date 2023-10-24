import { ethers } from "hardhat";

async function main() {
  const BorrowYourCar = await ethers.getContractFactory("BorrowYourCar");
  const borrowYourCar = await BorrowYourCar.deploy();
  await borrowYourCar.deployed();
  const myERC20Address = await borrowYourCar.myERC20();

  console.log(`BorrowYourCar deployed to ${borrowYourCar.address}`);
  console.log(`MyERC20 deployed to ${myERC20Address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});