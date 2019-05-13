module.exports = {
  networks: {
    // https://www.rinkeby.io/
    // https://blog.abuiles.com/blog/2017/07/09/deploying-truffle-contracts-to-rinkeby/
    rinkeby: {
      host: "localhost",
      port: 8545,
      from: "0x11901302c0daA053Ee33D90bBC20F5e4478609d8", // enter your local rinkeby unlocked address
      network_id: 4,
      gas: 4500000, // Gas limit used for deploys
      gasPrice: 10000000000 // 10 gwei
    },
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      from: "0xcDD89E5f17eb8F6ab99AFaBbF73BFeC8c19E8C06",
      network_id: "*",
      gas: 4500000, // Gas limit used for deploys
      gasPrice: 10000000000 // 10 gwei
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  // https://truffle.readthedocs.io/en/beta/advanced/configuration/
  mocha: {
    bail: true
  }
};
