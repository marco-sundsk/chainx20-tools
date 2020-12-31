'use strict';

require("dotenv").config();
const cfg = require("./config");
const curTime = require("./util_time");

const { ApiPromise, Keyring } = require("@polkadot/api");
const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { WsProvider } = require("@polkadot/rpc-provider");
const { options } = require("@chainx-v2/api");


const receivers = [
  {"addr": "5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa", "amount": 10000000, "remark": "1"},
  {"addr": "5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa", "amount": 10000000, "remark": "2"},
  {"addr": "5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa", "amount": 10000000, "remark": "3"},
]

var index = 0;

async function dispatch(api, sender) {
  if (index >= receivers.length) {
    process.exit(0);
  } else {
    await transfer(api, sender, receivers[index]['addr'], 
    receivers[index]['amount'], receivers[index]['remark']);
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
          unsub();
          dispatch(api, sender);
        }
      });
  } catch (err) {
    console.log(curTime(), err);
  }
  console.log(curTime(), "End of transfer func. target:", target, " Amount:", amount/Math.pow(10,8), " remark:", remark);
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

    const PHRASE = 'plug echo team palm stool bargain spike treat tired fee hybrid merry';
    const alice = keyring.addFromUri(PHRASE);
    console.log(`${alice.meta.name}: has address ${alice.address} with publicKey [${alice.publicKey}]`);

    // start transfer
    await dispatch(api, alice);
    // console.log(curTime(), 'Start sending a transfer ...');
    // const BOB = '5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa';
    // await transfer(api, alice, BOB, 10000000, '1');
    // console.log(curTime(), 'Return from transfer 1.');
    // await transfer(api, alice, BOB, 10000000, '2');
    // console.log(curTime(), 'Return from transfer 2.');
    // await transfer(api, alice, BOB, 10000000, '3');
    // console.log(curTime(), 'Return from transfer 3.');
}

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
