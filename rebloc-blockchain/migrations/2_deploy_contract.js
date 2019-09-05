var ReblocDatasetToken = artifacts.require("ReblocDatasetToken");

module.exports = function(deployer, network, accounts) {
    // const operator = accounts[0];
    const operator = '0x9346e8A0C76825Cd95BC3679ab83882Fd66448Ab';
    deployer.deploy(ReblocDatasetToken, operator, 
                                        {   from: '0x9346e8A0C76825Cd95BC3679ab83882Fd66448Ab',
                                            gas: 4500000,
                                            gasPrice: 10000000000
                                        });
};
