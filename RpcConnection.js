var RpcClient = require('bitcoind-rpc');
const lodash = require('lodash');

module.exports = class RpcConnection{

    init(config){
        this.rpc = new RpcClient(config);
    };

    convStrReal2BigInt (what){
        const strNumb = String(what);
        let base = 8;
        let value = parseInt(strNumb);
        const floatingAfter = strNumb.indexOf('.');
        if(floatingAfter>0){
            base=(floatingAfter+8+1)-strNumb.length;
            value=parseInt(strNumb.replace('.',''));
        }
        value = value * 10**base;
        return value;
    }

    async listunspent (address){
        if(this.rpc){
            const promise = await new Promise((resolve, reject) => {
                this.rpc.listunspent(0,999999,[address], (e,m) => e?reject(e):resolve(m));
            }).then((m)=>{
                if(m){
                    let result = {};
                    lodash.assign(result,m.result);
                    lodash.forEach(result,(e) => {e.amount = this.convStrReal2BigInt(e.amount)});
                    return result;
                }
                return null;
            }).catch(err => {throw err});
            return promise;
        }
        return null;
    };

    async sendRawTransaction(hexRawTransaction){
        if(this.rpc){
            const promise = await new Promise((resolve, reject) => {
                this.rpc.sendRawTransaction(hexRawTransaction, (e,m) => e?reject(e):resolve(m));
            }).then((m)=> {
                return m.result;
            }).catch(err => {throw err});
            return promise;
        }
        return "";
    }

    async getTransaction (TXID){
        if(this.rpc){
            const promise = await new Promise((resolve, reject) => {
                this.rpc.getTransaction(TXID, (e,m) => e?reject(e):resolve(m));
            }).then((m)=>{
                if(m.result)
                    return m.result;
                return null
            }).catch(err => {throw err});
            return promise;
        }
        return null;
    };


    async decoderawtransaction(rawTx){
        if(this.rpc){
            const promise = await new Promise((resolve, reject) => {
                this.rpc.decoderawtransaction(rawTx, (e,m) => e?reject(e):resolve(m));
            }).then((m)=>{
                if(m.result)
                    return m.result;
                return null;
            }).catch(err => {throw err});
            return promise;
        }
        return null;
    };

    async gettxout(TXID, Vout){
        if(this.rpc){
            const promise = await new Promise((resolve, reject) => {
                this.rpc.gettxout(TXID, Vout, (e,m) => e?reject(e):resolve(m));
            }).then((m)=>{
                if(m.result)
                    return m.result;
                return null;
            }).catch(err => {throw err});
            return promise;
        }
        return null;
    };

    async getBalanceOfUtxos(utxos){
        let balance =  0;
        if(lodash.filter(utxos,{}).length===0){
            return balance;
        }
        const instance = this;
        await Promise.all(utxos.map(async (u) => {
            const out = await instance.gettxout(u.hash,u.index);
            if(out) {
                balance = balance + out.value * 100000000;
            }
        }));
        return balance;
    };

    async generate(count){
        if(this.rpc){
            const promise = await new Promise((resolve, reject) => {
                this.rpc.generate(count, (e,m) => e?reject(e):resolve(m));
            }).then((m)=>{
                if(m.result)
                    return m.result;
                return null;
            }).catch(err => {throw err});
            return promise;
        }
        return null;
    };

    // for using listunspent
    async importaddress(address){
        if(this.rpc){
            const promise = await new Promise((resolve, reject) => {
                this.rpc.importaddress(address, (e,m) => e?reject(e):resolve(m));
            }).then((m)=>{
                if(m.result)
                    return m.result;
                return null;
            }).catch(err => {throw err});
            return promise;
        }
        return null;
    };
};
