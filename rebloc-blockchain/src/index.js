import Web3 from 'web3';

const web3 = new Web3('ws://localhost:7545');
console.log(web3);

web3.eth.getAccounts().then(console.log);



