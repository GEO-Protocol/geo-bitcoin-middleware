const bitcoin = require('bitcoinjs-lib');
const lodash = require('lodash');

module.exports = class BitcoinUtils{

    generateNewECPAIR(_network) {
        const keyPair = bitcoin.ECPair.makeRandom({ network: _network})

        const result = {};
        result.ECPair = keyPair;
        result.wif = keyPair.toWIF();
        result.pubkey = keyPair.publicKey;
        result.privateKey = keyPair.privateKey;
        result.p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: _network }).address;
        const _p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: _network });
        //segwit address
        result.p2wpkh = bitcoin.payments.p2sh({ redeem: _p2wpkh, network: _network }).address;

        return result;
    }

    importECPAIR(wif,_network) {
        const keyPair = bitcoin.ECPair.fromWIF(wif,_network);

        const result = {};
        result.ECPair = keyPair;
        result.wif = keyPair.toWIF();
        result.pubkey = keyPair.publicKey;
        result.privateKey = keyPair.privateKey;
        result.p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: _network }).address;
        const _p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: _network });
        //segwit address
        result.p2wpkh = bitcoin.payments.p2sh({ redeem: _p2wpkh, network: _network }).address;

        return result;
    }

    importECPAIRFromPublicKey(_publicKey,_network) {
        const keyPair = bitcoin.ECPair.fromPublicKey(_publicKey,_network);

        const result = {};
        result.ECPair = keyPair;
        result.wif = "none, from public key!";
        result.pubkey = keyPair.publicKey;
        result.p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: _network }).address;
        const _p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: _network });
        //segwit address
        result.p2wpkh = bitcoin.payments.p2sh({ redeem: _p2wpkh, network: _network }).address;

        return result;
    }

    // segwit
    makeNewAddressForMultiSig(_pubkeys, _required, _network) {
        const p2ms = bitcoin.payments.p2ms({ m: _required, pubkeys: _pubkeys, network: _network });
        const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network: _network });
        return bitcoin.payments.p2sh({ redeem: p2wsh, network: _network }).address;
    }

    getBalance (utxos){
        let balance = 0;
        lodash.forEach(utxos,x => balance=balance+parseInt(x.amount));
        return balance;
    };

    collectUnspentForTarget(utxos, targetValue){
        const result = [];
        if(this.getBalance(utxos)<targetValue)
            return result;
        //try find one input
        utxos = lodash.orderBy(utxos,"amount","asc");
        lodash.forEach(utxos, function (u) {
            if(u.amount >= targetValue){
                result.push(u);
                return false;
            }
        });
        if(result.length>0)
            return result;
        //collect from many inputs
        utxos = lodash.orderBy(utxos,"amount","desc");
        let collectedBalance = 0;
        lodash.forEach(utxos, function (u) {
            collectedBalance = collectedBalance + u.amount;
            result.push(u);
            if(collectedBalance >= targetValue)
                return false;
        });
        return result;
    };

    /*
    unspents - all used in transaction, expected all from one destination
    destinations - array of {address ,amount}, less of unspents balance for fee
     */
    prepareInOutForTransaction(unspents, destinations, network){
        const bldr = new bitcoin.TransactionBuilder( network )
        lodash.forEach(unspents,(u) => {
            bldr.addInput(u.txid,u.vout);
        });
        lodash.forEach(destinations,(d) => {
            bldr.addOutput(d.address,d.amount);
        });
        return bldr.buildIncomplete().toHex();
    }

    /*
    expected sign P2WPKH, hexTx contains one input
     */
    signTransactionP2WPKH(hexTx,keyPair, unspentAmount, network){
        const transaction = new bitcoin.Transaction.fromHex( hexTx );

        const bldr = new bitcoin.TransactionBuilder.fromTransaction( transaction, network );

        const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: network });
        const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network: network });

        lodash.forEach(lodash.range(0,transaction.ins.length), (i) => {
            bldr.sign(i, keyPair, p2sh.redeem.output, null,  unspentAmount[i]);
        });

        return bldr.buildIncomplete().toHex();
    }

    /*
    expected sign MultiSig 2 of set, hexTx contains one input
    function sign by one keyPair
     */
    signTransactionMultisig(hexTx, pubkeys, keyPair, unspentAmount, network){
        const transaction = new bitcoin.Transaction.fromHex( hexTx );

        const bldr = new bitcoin.TransactionBuilder.fromTransaction( transaction, network );

        const p2ms = bitcoin.payments.p2ms({ m: 2, pubkeys: pubkeys, network: network });
        const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network: network });
        const p2sh = bitcoin.payments.p2sh({ redeem: p2wsh, network: network });

        if(transaction.ins.length>1){
            throw "not implement, in transaction 'multisig' many utxo inputs";// todo
        }

        bldr.sign(0, keyPair, p2sh.redeem.output, null, unspentAmount, p2wsh.redeem.output)

        return bldr.buildIncomplete().toHex();
    }

    getUtxosFromRawTx(hexTx) {
        const transaction = new bitcoin.Transaction.fromHex( hexTx );
        const result = [];
        lodash.forEach(transaction.ins, function (t) {
            result.push({hash : t.hash.toString('hex'), index : t.index});
        });
        return result;
    }
};
