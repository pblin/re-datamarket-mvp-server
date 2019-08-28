var ReblocDatasetToken = artifacts.require("ReblocDatasetToken");

module.exports = function(deployer, network, accounts) {
    const operator = accounts[0];
    deployer.deploy(ReblocDatasetToken, operator, 
                                        {   from: accounts[0],
                                            gas: 4500000,
                                            gasPrice: 10000000000
                                        });
};
