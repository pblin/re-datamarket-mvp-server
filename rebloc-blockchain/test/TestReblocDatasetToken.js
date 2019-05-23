const ReblocDatasetToken = artifacts.require("ReblocDatasetToken");

contract("Rebloc Token Test", async accounts => {
  const operator = '0x9346e8A0C76825Cd95BC3679ab83882Fd66448Ab';
  let rtk;
  it("should get operator account back", async () => {
    rtk = await ReblocDatasetToken.new(operator);
  });

  it("operator account should match", async () => {
    rtk = await ReblocDatasetToken.deployed();
    let result = await rtk.getOperatorAccount();
    assert.equal(result, '0x9346e8A0C76825Cd95BC3679ab83882Fd66448Ab');
  });
});