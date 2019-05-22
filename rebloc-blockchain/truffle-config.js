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
    development: {
      host: "127.0.0.1",
      port: 7545,
      from: "0x99cc20A80C933ea87ED49Ff04C766aA1f270A230",
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
  compilers: {
     solc: {
       version: "0.5.3" // ex:  "0.4.20". (Default: Truffle's installed solc)
     }
  },
  // https://truffle.readthedocs.io/en/beta/advanced/configuration/
  mocha: {
    bail: true
  }
};
