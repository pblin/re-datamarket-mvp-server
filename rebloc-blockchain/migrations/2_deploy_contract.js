var ReblocDatasetToken = artifacts.require("ReblocDatasetToken");

module.exports = function(deployer, network, accounts) {
    // const operator = accounts[0];
    const operator = '{oerator's wallet address}';
    deployer.deploy(ReblocDatasetToken, operator, 
                                        {   from: '{operator's wallet address',
                                            gas: 4500000,
                                            gasPrice: 10000000000
                                        });
};
