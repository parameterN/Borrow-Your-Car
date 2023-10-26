import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://127.0.0.1:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0x08889c9ac110445615e70e9dee7fc91ba6d0d7bdb743028a1a55391a64b74489',
        '0xacae861b8926915c241c6b8fa96bc7f58a00dcea1f4c81172d249335eb8e9762',
        '0xdb303c7cdbe63694b772161134881384660133d5f55963e00b2461fbf6036f07',
        '0x1948397700c443b06f0a94e0477b07fc65388190abb26e74cfcee4f6f6894c9b'
      ]
    },
  },
};

export default config;
