const BitcoinUtils = require('./BitcoinUtils');
const RpcConnection = require('./RpcConnection');
const config = require('./connection-config.json');

const rpcConnection = new RpcConnection();
rpcConnection.init(config);
const bitcoinUtils = new BitcoinUtils();

module.exports = class CooperativeClose{
    //
    // channel;
    // txid;

    init (channel, txid){
        this.channel = channel;
        this.txid = txid;
    };

    async create_tx (destinations){
        const unspent = await rpcConnection.listunspent(this.channel.multisigAddress);
        return bitcoinUtils.prepareInOutForTransaction(unspent,destinations,this.channel.network);
    };

    sign_tx (hexTx){
        return bitcoinUtils.signTransactionMultisig(
            hexTx,
            this.channel.pubkeys,
            this.channel.wallet.ECPair,
            this.channel.chanelBalance,
            this.channel.network);
    };
};