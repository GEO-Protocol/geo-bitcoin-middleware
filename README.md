# Documentation
https://documenter.getpostman.com/view/5693285/RWgxsuTZ

# Install
1. npm i
2. copy and rename "connection-config example.json" to "connection-config.json"
3. change for self
..."protocol": "http",
..."user": "u", 						- username like for  bitcoind -rpcuser=
..."pass": "p", 						- password like for  bitcoind -rpcpassword=
..."host": "127.0.0.1",
..."port": "18443"						- port for network 8332 mainet, 18332 testnet, 18443 regtes
..."network_name" : "regtest"			- network name mainet, testnet, regtes
..."faucet_wif_fortest" : "cT8G...fp", 	- faucet witch ballance for test
..."own_wif" : "cRJSbHx....yLsq", 		- wallet for

# Launch bitcoind for example
bitcoind -regtest -rpcuser=u -rpcpassword=p

# Useful commands for bitcoin-cli regtest
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p generate 5
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p generatetoaddress 10 2MwXRZ1TswYe1X6JuCjoo4N4ZALNHGkkTUV
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p getbalance
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p getblockcount

bitcoin-cli -regtest -rpcuser=u -rpcpassword=p generatetoaddress 10 2MuVXUPM3FEyqyKUnLDexmQbCc5MBPBZ7Wg
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p sendtoaddress mhX9kiCCgTHZxfwPcsKFwrxysbYqVGUtXY 2.5151

for new addres use importaddress before listunspent
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p importaddress 2MwuRr82gci6kdTh22TQsDkfSwnEcBBjzMD
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p listunspent 0 99999999 [\"mhX9kiCCgTHZxfwPcsKFwrxysbYqVGUtXY\"]

bitcoin-cli -regtest -rpcuser=u -rpcpassword=p decoderawtransaction 4b9b519646a932346c73fa2ae7f7a7ef45db2cf5a83de4f454bf7cc0a915ec36
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p validateaddress 2N99SDNtYjxBYTVbeEtt1XnExHs9H8Nmcdp
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p getaddressinfo 2MuVXUPM3FEyqyKUnLDexmQbCc5MBPBZ7Wg
bitcoin-cli -regtest -rpcuser=u -rpcpassword=p getrawtransaction 462aa6ab4a61e73500f2be7031bba2160b50f530bf5db81bca8cc150a8ef92fe 1

# Tests
node TestMiddleware.js

# Launching REST server
node app.js