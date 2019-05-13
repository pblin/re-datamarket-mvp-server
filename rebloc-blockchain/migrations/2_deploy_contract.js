var KittyMinting = artifacts.require("KittyMinting");
var KittyBreeding= artifacts.require("KittyBreeding");
var KittyOwnership = artifacts.require("KittyOwnership");

module.exports = function(deployer) {
    deployer.deploy(KittyMinting);
    deployer.deploy(KittyBreeding);
    deployer.deploy(KittyOwnership);
};
