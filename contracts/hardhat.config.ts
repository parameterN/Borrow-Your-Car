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
        // '0xdbd31fcfa97fa705d72c45b6b41df1c9906554ecd9e63abd31d916718f386ee8',
        // '0x26c3c3f8dc06342a1af3b3a9dc66c09f4fc70738d2216c3178b95c00d370f900',
        // '0x071734e3c97b9aa975c038e34a593055d44eda6c7372ef7d1d62c9d60a6bdfbe'
        '0x2b43a83aa9d0dc613f3ee4c6001de7d7690576dfcc252a2c08784beb90d1ea18',
        '0xdf4da55e090b27dd7823c44005c7fc270fb8e6a6e10f57a3b705846a64650d1b'
      ]
    },
  },
};

export default config;
