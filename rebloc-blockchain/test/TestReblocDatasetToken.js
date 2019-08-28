
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
  const operator = accounts[0];
  let rtk;
  it("operator account should match", async () => {
    await ReblocDatasetToken.new(operator);
    rtk = await ReblocDatasetToken.deployed();

    let result = await rtk.getOperatorAccount();
    //console.log (result);
    assert.equal(result, accounts[0]);
  });

  it("Should mint a ReblocDatasetToken", async function () {
    let id = guidToBytes('6362c97c-6134-11e9-934c-f40f2427ca38');

    let txn_receipt = await rtk.mint(id, 'f6f6f311da4dba2e00bdb3b382e29281', 'gzip', 'QmPCAp4imdCT7VYUyab1FMNZEsAWnDoLQ3RQ5VNLcCm1f7' , 19390,
                            100, 'usd', 'http://demo-app.rebloc.io:8080/ipfs/QmPCAp4imdCT7VYUyab1FMNZEsAWnDoLQ3RQ5VNLcCm1f7',accounts[1],{from:accounts[0]});

    let name = await rtk.name();
    console.log(`token name = ${name}`);
    console.log("token id = " + JSON.stringify(txn_receipt));
    
    let symbol = await rtk.symbol();
    console.log("symbol =" + symbol)
    let  balance = await rtk.balanceOf(accounts[1]);
    console.log("account 1 token balance:" + balance);
    assert.equal(balance, 1);
  });

  it("Should complete a token purchase", async function() {
    let token_id = 0;
    await rtk.purchaseWithFiat(token_id,50,accounts[2],{from:accounts[1]});
    let balance = await rtk.balanceOf(accounts[2]);
    console.log("account 2 token balance:" + balance);
    assert.equal(balance, 1);
  });
});