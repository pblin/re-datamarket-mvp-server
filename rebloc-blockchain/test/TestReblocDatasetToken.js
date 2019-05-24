function guidToBytes(guid) {
    var bytes = [];
    guid.split('-').map((number, index) => {
        var bytesInChar = index < 3 ? number.match(/.{1,2}/g).reverse() :  number.match(/.{1,2}/g);
        bytesInChar.map((byte) => { bytes.push(parseInt(byte, 16));})
    });
    return bytes;
}

const ReblocDatasetToken = artifacts.require("ReblocDatasetToken");

contract("Rebloc Token Test", async accounts => {
  const operator = '0x9346e8A0C76825Cd95BC3679ab83882Fd66448Ab';
  let rtk;
  it("operator account should match", async () => {
    await ReblocDatasetToken.new(operator);
    rtk = await ReblocDatasetToken.deployed();

    let result = await rtk.getOperatorAccount();
    //console.log (result);
    assert.equal(result, '0x9346e8A0C76825Cd95BC3679ab83882Fd66448Ab');
  });

  it("should mint a ReblocDatasetToken", async () => {
    id = guidToBytes('6362c97c-6134-11e9-934c-f40f2427ca38');

    await rtk.mint(id, 'f6f6f311da4dba2e00bdb3b382e29281', 'gzip', 10349, 'QmPCAp4imdCT7VYUyab1FMNZEsAWnDoLQ3RQ5VNLcCm1f7' , 
                            10339, 'usd', 'http://demo-app.rebloc.io:8080/ipfs/QmPCAp4imdCT7VYUyab1FMNZEsAWnDoLQ3RQ5VNLcCm1f7');

    id = guidToBytes('66267de8-6134-11e9-934c-f40f2427ca38');
    await rtk.mint(id, 'd04e8ad727792c9cb7d72985a52164ed', 'gzip', 10, 'QmTHHFgvCPLHChwLqci8RL6wRSToCrreDuAE3TeZgv68Yw' , 
                            1000, 'usd', 'http://demo-app.rebloc.io:8080/ipfs/QmTHHFgvCPLHChwLqci8RL6wRSToCrreDuAE3TeZgv68Yw');
    let balance = await rtk.balanceOf (accounts[0]);
    console.log(accounts[0]);
    console.log(balance);
    assert.equal(balance, 2);
  });

it("should transfter token from accounts[0] to 0x9346e8a0c76825cd95bc3679ab83882fd66448ab", async () => {

    await rtk.safeTransferFrom(accounts[0],'0x9346e8a0c76825cd95bc3679ab83882fd66448ab',0);
    let  balance = await rtk.balanceOf ('0x9346e8a0c76825cd95bc3679ab83882fd66448ab')
    console.log(balance);
    assert.equal(balance, 1);
  });
});