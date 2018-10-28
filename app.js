const express = require('express');
const app = express();
const lodash = require('lodash');
const RpcConnection = require('./RpcConnection');
const BitcoinUtils = require('./BitcoinUtils');
const bitcoin = require('bitcoinjs-lib');
const Channel = require('./Channel');
const CooperativeClose = require('./CooperativeClose');

const config = require('./connection-config.json');
let NETWORK = bitcoin.networks.bitcoin;
if (config.network_name === "testnet")
    NETWORK = bitcoin.networks.testnet;
else if (config.network_name === "regtest")
    NETWORK = bitcoin.networks.testnet;

const rpcConnection = new RpcConnection();
rpcConnection.init(config);
const bitcoinUtils = new BitcoinUtils();

const wallet = bitcoinUtils.importECPAIR(config.own_wif, NETWORK);
console.log("Address", wallet.p2wpkh);
console.log("Public Key", wallet.pubkey.toString('hex'));
rpcConnection.importaddress(wallet.p2wpkh).then().catch(console.error);

app.get('/channel/open', async (req, res) => {
    const pubKeyBob = req.param("pubKeyBob");
    let value = req.param("value");

    if (pubKeyBob === undefined || value === undefined) {
        res.send("400");//bad request
        return;
    }

    try {
        value = parseInt(value);
        const pubKeyBobBuffer = Buffer.from(pubKeyBob, 'hex');

        const channel = new Channel();
        channel.init(wallet.wif, NETWORK);

        const txid = await channel.open(pubKeyBobBuffer, value);

        const result = {};
        result.txid = txid;
        result["pubKey1"] = channel.pubkeys[0].toString('hex');
        result["pubKey2"] = channel.pubkeys[1].toString('hex');
        result["channel_balance"] = channel.chanelBalance;
        res.send(result);
    }
    catch (e) {
        console.error(e);
        if (JSON.stringify(e) === "{}")
            res.send("error " + e.toString());
        else
            res.send("error " + JSON.stringify(e));
    }
});

app.get('/channel/coop_close/create_tx', async (req, res) => {
    const pubKey1 = req.param("pubKey1");
    const pubKey2 = req.param("pubKey2");
    let value1 = req.param("value1");
    let value2 = req.param("value2");
    let channel_balance = req.param("channel_balance");

    if (pubKey1 === undefined
        || pubKey2 === undefined
        || value1 === undefined
        || value2 === undefined
        || channel_balance === undefined) {
        res.send("400");//bad request
        return;
    }

    try {
        value1 = parseInt(value1);
        value2 = parseInt(value2);
        channel_balance = parseInt(channel_balance);
        const pubKeys = [
            Buffer.from(pubKey1, 'hex'),
            Buffer.from(pubKey2, 'hex')
        ];

        const multisigAddress = bitcoinUtils.makeNewAddressForMultiSig(pubKeys, 2, NETWORK);

        const channel = new Channel();
        channel.init(wallet.wif, NETWORK,
            multisigAddress,
            pubKeys,
            channel_balance);

        const cooperativeClose = new CooperativeClose();
        cooperativeClose.init(channel);

        const destinations = [
            {address: bitcoinUtils.importECPAIRFromPublicKey(pubKeys[0], NETWORK).p2wpkh, amount: value1},
            {address: bitcoinUtils.importECPAIRFromPublicKey(pubKeys[1], NETWORK).p2wpkh, amount: value2}
        ];

        const rawTxUnsigned = await cooperativeClose.create_tx(destinations);
        const rawTxSign = cooperativeClose.sign_tx(rawTxUnsigned);

        res.send(rawTxSign);
    }
    catch (e) {
        console.error(e);
        if (JSON.stringify(e) === "{}")
            res.send("error " + e.toString());
        else
            res.send("error " + JSON.stringify(e));
    }
});

app.get('/channel/coop_close/sign_tx', async (req, res) => {
    const pubKey1 = req.param("pubKey1");
    const pubKey2 = req.param("pubKey2");
    let hexTx = req.param("hexTx");
    let channel_balance = req.param("channel_balance");

    if (pubKey1 === undefined
        || pubKey2 === undefined
        || hexTx === undefined
        || channel_balance === undefined) {
        res.send("400");//bad request
        return;
    }

    try {
        channel_balance = parseInt(channel_balance);
        const pubKeys = [
            Buffer.from(pubKey1, 'hex'),
            Buffer.from(pubKey2, 'hex')
        ];

        const multisigAddress = bitcoinUtils.makeNewAddressForMultiSig(pubKeys, 2, NETWORK);

        const channel = new Channel();
        channel.init(wallet.wif, NETWORK,
            multisigAddress,
            pubKeys,
            channel_balance);

        const cooperativeClose = new CooperativeClose();
        cooperativeClose.init(channel);

        const rawTxAllSign = await cooperativeClose.sign_tx(hexTx);
        const txid = await rpcConnection.sendRawTransaction(rawTxAllSign);

        res.send(txid);
    }
    catch (e) {
        console.error(e);
        if (JSON.stringify(e) === "{}")
            res.send("error " + e.toString());
        else
            res.send("error " + JSON.stringify(e));
    }
});

app.get('/confirmations', async (req, res) => {
    let txid = req.param("txid");

    if (txid === undefined) {
        res.send("400");//bad request
        return;
    }

    try {
        const txInfo = await rpcConnection.getTransaction(txid);

        res.send(String(txInfo["confirmations"]));
    }
    catch (e) {
        console.error(e);
        if (JSON.stringify(e) === "{}")
            res.send("error " + e.toString());
        else
            res.send("error " + JSON.stringify(e));
    }
});

app.get('/getbalance', async (req, res) => {
    let address = req.param("address");

    try {
        if (address === undefined) {
            address = wallet.p2wpkh;
        }
        await rpcConnection.importaddress(address);
        const unspent = await rpcConnection.listunspent(address);
        const balance = bitcoinUtils.getBalance(unspent);
        res.send(String(balance));
    }
    catch (e) {
        console.error(e);
        if (JSON.stringify(e) === "{}")
            res.send("error " + e.toString());
        else
            res.send("error " + JSON.stringify(e));
    }
});

app.get('/getwalletkeys', async (req, res) => {
    try {
        const walletInfo = {};
        walletInfo.address = wallet.p2wpkh;
        walletInfo.public_key = wallet.pubkey.toString('hex');
        walletInfo.private_key = wallet.privateKey.toString('hex');
        walletInfo.wif = wallet.wif.toString('hex');
        res.send(JSON.stringify(walletInfo));
    }
    catch (e) {
        console.error(e);
        if (JSON.stringify(e) === "{}")
            res.send("error " + e.toString());
        else
            res.send("error " + JSON.stringify(e));
    }
});

function toHexString(bytes) {
    return bytes.map(function(byte) {
        return (byte & 0xFF).toString(16)
    }).join('')
}

app.listen(parseInt(config.listening_port), function () {
    console.log('Listening has been started, port', config.listening_port);
});