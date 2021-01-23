'use strict';

require("dotenv").config();
const cfg = require("./config");
const curTime = require("./util_time");

const { ApiPromise, Keyring } = require("@polkadot/api");
// const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { WsProvider } = require("@polkadot/rpc-provider");
const { options } = require("@chainx-v2/api");


const receivers = [
  {"addr": "5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa", "amount": 10000000, "remark": "1"},
  {"addr": "5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa", "amount": 10000000, "remark": "2"},
  {"addr": "5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa", "amount": 10000000, "remark": "3"},
]

var index = 0;

async function dispatch(api, sender) {
  if (index >= cfg.receivers.length) {
    console.log(curTime(), 'All Reward Distributed.');
    process.exit(0);
  } else {
    console.log(curTime(), "Transfer award to target: " + cfg.receivers[index]['addr']);
    await transfer(api, sender, cfg.receivers[index]['addr'], 
    cfg.receivers[index]['amount'], cfg.receivers[index]['remark']);
    index += 1;
  }
}

async function transfer(api, sender, target, amount, remark) {
  try {
    const txs = [
      api.tx.balances.transfer(target, amount),
      api.tx.system.remark(remark)
    ];

    const unsub = await api.tx.utility.batch(txs).signAndSend(sender, (result) => {
        // console.log(curTime(), `Current status is ${result.status}`);
        if (result.status.isInBlock) {
          console.log(curTime(), remark, `Transaction included at blockHash ${result.status.asInBlock}`);
        } else if (result.status.isFinalized) {
          console.log(curTime(), remark, `Transaction finalized at blockHash ${result.status.asFinalized}`);
          console.log(curTime(), "Transfer OK! target:", target);
          unsub();
          dispatch(api, sender);
        }
      });
  } catch (err) {
    console.log(curTime(), err);
  }
  
}


async function main() {
    console.log(curTime(), 'Reward sender for ChainX20. Version: 0.9.0');
    console.log('Env is:');
    console.log('chainx_ws_addr:', process.env.chainx_ws_addr);
    // console.log('Cfg is:');
    // console.log('ref account:', cfg.account);
    console.log('');

    const wsProvider = new WsProvider(process.env.chainx_ws_addr);
    const api = await ApiPromise.create(options({ provider: wsProvider }));
    await api.isReady;

    // define sender
    const keyring = new Keyring({ type: 'sr25519' });
    keyring.setSS58Format(44);
    const sender = keyring.addFromUri(cfg.phrase);
    console.log(`Sender address ${sender.address} with publicKey [${sender.publicKey}]`);

    // start transfer
    await dispatch(api, sender);
}

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
