const RpcConnection = require('./RpcConnection');
const BitcoinUtils = require('./BitcoinUtils');
const bitcoin = require('bitcoinjs-lib');
const Channel = require('./Channel');
const CooperativeClose = require('./CooperativeClose');
const lodash = require('lodash');

const config = require('./connection-config.json');
let NETWORK = bitcoin.networks.bitcoin;
if (config.network_name==="testnet")
    NETWORK = bitcoin.networks.testnet;
else if (config.network_name==="regtest")
    NETWORK = bitcoin.networks.testnet;

const rpcConnection = new RpcConnection();
const bitcoinUtils = new BitcoinUtils();

rpcConnection.init(config);

test = async () => {

    // const i = bitcoinUtils.generateNewECPAIR(NETWORK);
    // console.log(i.wif);
    //
    // const test = bitcoinUtils.generateNewECPAIR(NETWORK);
    // console.log(test.wif);


    const faucetWallet = bitcoinUtils.importECPAIR(config.faucet_wif_fortest,NETWORK);
    await rpcConnection.importaddress(faucetWallet.p2wpkh);
    console.log("faucetWallet",faucetWallet.p2wpkh);

    const aliceWallet = bitcoinUtils.generateNewECPAIR(NETWORK);
    console.log("aliceWallet",aliceWallet.p2wpkh);
    await rpcConnection.importaddress(aliceWallet.p2wpkh);

    const bobWallet = bitcoinUtils.generateNewECPAIR(NETWORK);
    console.log("bobWallet",bobWallet.p2wpkh);
    await rpcConnection.importaddress(bobWallet.p2wpkh);

    const aliceChannel = new Channel();
    aliceChannel.init(aliceWallet.wif, NETWORK);

    const depositValue = 100000;
    {
        // deposit for alice
        const faucetUnspent = await rpcConnection.listunspent(faucetWallet.p2wpkh);
        const inputUtxos = bitcoinUtils.collectUnspentForTarget(faucetUnspent,depositValue);
        const faucetUsedBalance = bitcoinUtils.getBalance(inputUtxos);
        const unspentsValues = [];
        lodash.forEach(inputUtxos,(e) => unspentsValues.push(e.amount));
        const destinations = [
            { address: aliceWallet.p2wpkh, amount : depositValue + parseInt(config.defaultFee)},// alice
            { address: faucetWallet.p2wpkh, amount : faucetUsedBalance - depositValue - 2 * parseInt(config.defaultFee) } // short change
        ];
        const rawTxUnsigned = bitcoinUtils.prepareInOutForTransaction(inputUtxos,destinations,NETWORK);
        const rawTx = bitcoinUtils.signTransactionP2WPKH(rawTxUnsigned,faucetWallet.ECPair,unspentsValues,NETWORK);
        const txid = await rpcConnection.sendRawTransaction(rawTx);
        console.log("faucet to alice txid",txid);
    }

    const txid = await aliceChannel.open(bobWallet.pubkey,depositValue);

    const bobChannel = new Channel();
    bobChannel.init(bobWallet.wif, NETWORK,
        // todo get it from tx by txid
        aliceChannel.multisigAddress,
        aliceChannel.pubkeys,
        aliceChannel.chanelBalance);

    const aliceCooperativeClose = new CooperativeClose();
    aliceCooperativeClose.init(aliceChannel,txid);

    const aliceCashBack = 30000;
    const bobCashBack = aliceChannel.chanelBalance - aliceCashBack - config.defaultFee;
    const destinations = [
        { address: aliceWallet.p2wpkh, amount : aliceCashBack },
        { address: bobWallet.p2wpkh, amount : bobCashBack}
    ];
    const rawTxUnsigned = await aliceCooperativeClose.create_tx(destinations);
    const rawTxSignAlice = aliceCooperativeClose.sign_tx(rawTxUnsigned);

    // now send rawTxSignAlice to bob

    const bobCooperativeClose = new CooperativeClose();
    bobCooperativeClose.init(bobChannel,txid);
    const rawTxSignAll = bobCooperativeClose.sign_tx(rawTxSignAlice);

    const cashBackTxid = await rpcConnection.sendRawTransaction(rawTxSignAll);
    console.log("multisig cashback txid",cashBackTxid);

    const aliceUnspent = await rpcConnection.listunspent(aliceWallet.p2wpkh);
    const aliceBalance = bitcoinUtils.getBalance(aliceUnspent);
    const bobUnspent = await rpcConnection.listunspent(bobWallet.p2wpkh);
    const bobBalance = bitcoinUtils.getBalance(bobUnspent);
    if(aliceBalance === aliceCashBack && bobBalance === bobCashBack) {
        console.log("test pass!!!");
    }
    else {
        console.log("aliceBalance , aliceCashBack , bobBalance , bobCashBack",aliceBalance , aliceCashBack , bobBalance , bobCashBack);
        console.log("test fail!!!");
    }
};

makeWalletForTest = async () => {
    const pair = bitcoinUtils.generateNewECPAIR(NETWORK);
    console.log("p2wpkh",pair.p2wpkh);
    console.log("wif",pair.wif);
    console.log("pubkey",pair.pubkey.toString('hex'));
}

//---------------------------------
// all tests
// makeWalletForTest().then().catch(console.error);
// makeWalletForTest().then().catch(console.error);
test().then().catch(console.error);
//---------------------------------