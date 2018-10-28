const BitcoinUtils = require('./BitcoinUtils');
const RpcConnection = require('./RpcConnection');
const config = require('./connection-config.json');
const lodash = require('lodash');

const rpcConnection = new RpcConnection();
rpcConnection.init(config);
const bitcoinUtils = new BitcoinUtils();

module.exports = class Channel{
    // wallet;
    // network;
    //
    // multisigAddress;
    // pubkeys;
    // chanelBalance;

    init (ownWIF, network, multisigAddress, pubkeys, chanelBalance){
        this.wallet = bitcoinUtils.importECPAIR(ownWIF,network);
        this.network = network;

        // todo get it from txid for second chanel?!
        this.multisigAddress = multisigAddress;
        this.pubkeys = pubkeys;
        this.chanelBalance = chanelBalance;
    };

    async open (secondPublicKey,value){
        const unspent = await rpcConnection.listunspent(this.wallet.p2wpkh);
        const pubkeys = [
            this.wallet.pubkey,
            secondPublicKey
        ]
        const multisigAddress = bitcoinUtils.makeNewAddressForMultiSig(pubkeys,2,this.network);
        this.pubkeys = pubkeys;
        this.multisigAddress = multisigAddress;
        await rpcConnection.importaddress(multisigAddress);
        const reserve = bitcoinUtils.getBalance(unspent);
        if(reserve < value+parseInt(config.defaultFee)){
            throw "can't open chanel, low balance";
        }
        this.chanelBalance = value ;
        const destinations = [{ address: multisigAddress, amount : this.chanelBalance }];
        const shortChange = reserve - value - parseInt(config.defaultFee);
        const unspenstValues = [];
        lodash.forEach(unspent,(e) => unspenstValues.push(e.amount));
        if(shortChange>0){
            destinations.push({ address: this.wallet.p2wpkh, amount : shortChange });
        }
        const rawTxUnsigned = bitcoinUtils.prepareInOutForTransaction(unspent,destinations,this.network);
        const rawTx = bitcoinUtils.signTransactionP2WPKH(rawTxUnsigned, this.wallet.ECPair, unspenstValues, this.network);
        return await rpcConnection.sendRawTransaction(rawTx);
    };
};
