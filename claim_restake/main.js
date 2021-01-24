'use strict';

require("dotenv").config();
const cfg = require("./config");
const curTime = require("./util_time");

const { ApiPromise, Keyring } = require("@polkadot/api");
const { u8aToHex } = require("@polkadot/util");
const { WsProvider } = require("@polkadot/rpc-provider");
const { options } = require("@chainx-v2/api");


const BUILDLINKS = '5Pjajd12o9hVixBPRPHZEdjsrct3NZp9Ge7QP4PiSivQrBZa';
// ******* 复投相关参数 由命令行参数提供*******
var reserve_pcx = parseInt(5 * cfg.units.PCX_FEE + 9999 * cfg.units.PCX);
var min_vote = 9999 * cfg.units.PCX; // 业务定义的最小投票金额，用户余额扣除reserve后要超过此值才发起投票
var min_claim = 9999 * cfg.units.PCX; // 业务定义的最小提息金额
var accname;
var sender;
var accaddr;

async function dispatch(api, rslt) {
  if (!rslt.prev_success) {
    console.log("Encounter Error, dispatch process halted!");
    process.exit(-1);
  }
  if (rslt.prev_action == "init") {
    // step1 get unclaimed pcx
    console.log("dispatching get_unclaim ...");
    get_unclaim(api, { "account": accaddr, "target": BUILDLINKS });
  } else if (rslt.prev_action == "getUnclaim") {
    // step2 calim or get balance
    if (rslt.prev_result < min_claim) {
      console.log("Not enough unclaimed, skip claim step.");
      console.log("dispatching get_balance ...");
      get_balance(api, { "account": accaddr });
    } else {
      console.log("dispatching claim ...");
      claim(api, { "target": BUILDLINKS });
    }
  } else if (rslt.prev_action == "claim") {
    // step3 get balance
    console.log("dispatching get_balance ...");
    get_balance(api, { "account": accaddr });
    console.log("After dispatch get_balance");

  } else if (rslt.prev_action == "getBalance") {
    // step4 do vote
    if (rslt.prev_result < min_vote) {
      console.log("Not enough balance to revote, dispatch process ended.");
      process.exit(0);
    }
    console.log("dispatching vote ...");
    vote(api, { "target": BUILDLINKS, "amount": rslt.prev_result - reserve_pcx });
  } else if (rslt.prev_action == "bond") {
    console.log("Whole process is successful.");
    process.exit(0);
  }
}

async function get_unclaim(api, params) {
  try {
    const staking = await api.rpc.xstaking.getDividendByAccount(params.account);
    const stakingObj = staking.toJSON();
    let pcx_profit = 0;
    for (var validator in stakingObj) {
      if (validator == params.target) {
        pcx_profit = parseInt(stakingObj[validator]);
        break;
      }
    }
    console.log('[get_unclaim]pcx_profit:', pcx_profit);
    dispatch(api, { "prev_action": "getUnclaim", "prev_success": true, "prev_result": pcx_profit });
  } catch (err) {
    console.log(curTime(), err);
    dispatch(api, { "prev_action": "getUnclaim", "prev_success": false });
  }
}

async function get_balance(api, params) {
  try {
    let {
      data: balance,
      nonce: previousNonce,
    } = await api.query.system.account(params.account);
    let free = parseInt(balance.free) - parseInt(balance.miscFrozen);
    console.log('[get_balance]free_balance:', free);
    dispatch(api, { "prev_action": "getBalance", "prev_success": true, "prev_result": free });
  } catch (err) {
    console.log(curTime(), err);
    dispatch(api, { "prev_action": "getBalance", "prev_success": false });
  }
}

async function claim(api, params) {
  try {
    console.log("[claim]Start claim from", params.target);
    const unsub = await api.tx.xStaking.claim(params.target).signAndSend(sender, (result) => {
      if (result.status.isInBlock) {
        console.log(curTime(), `Transaction included at blockHash ${result.status.asInBlock}`);
      } else if (result.status.isFinalized) {
        console.log(curTime(), `Transaction finalized at blockHash ${result.status.asFinalized}`);
        console.log("[claim]Claim OK! target:", params.target);
        unsub();
        dispatch(api, { "prev_action": "claim", "prev_success": true });
      }
    });
  } catch (err) {
    console.log(curTime(), err);
    dispatch(api, { "prev_action": "claim", "prev_success": false });
  }
}

async function vote(api, params) {
  try {
    console.log("[vote]Start vote to:", params.target, " with ", params.amount, " PCX");
    const unsub = await api.tx.xStaking.bond(params.target, params.amount).signAndSend(sender, (result) => {
      if (result.status.isInBlock) {
        console.log(curTime(), `Transaction included at blockHash ${result.status.asInBlock}`);
      } else if (result.status.isFinalized) {
        console.log(curTime(), `Transaction finalized at blockHash ${result.status.asFinalized}`);
        console.log("[vote]Bond OK! target:", params.target);
        unsub();
        dispatch(api, { "prev_action": "bond", "prev_success": true });
      }
    });
  } catch (err) {
    console.log(curTime(), err);
    dispatch(api, { "prev_action": "bond", "prev_success": false });
  }
}

async function main() {
  console.log(curTime(), 'Revote tool for ChainX20. Version: 0.9.0');
  console.log('Env is:');
  console.log('chainx_ws_addr:', process.env.chainx_ws_addr);
  console.log('');

  const args = process.argv.slice(2);
  console.log(args);
  for (let arg of args) {
    let parts = arg.split('=');
    if (parts[0] == 'reserve') {
      reserve_pcx = parseInt(5 * cfg.units.PCX_FEE + parseFloat(parts[1]) * cfg.units.PCX);
    } else if (parts[0] == 'min_vote') {
      min_vote = parseInt(parseFloat(parts[1]) * cfg.units.PCX);
    } else if (parts[0] == 'min_claim') {
      min_claim = parseInt(parseFloat(parts[1]) * cfg.units.PCX);
    } else if (parts[0] == 'acc') {
      accName = parts[1];
    }
  }
  console.log('acc:', accName, ', reserve', reserve_pcx / cfg.units.PCX, 'PCX');
  console.log('min_claim', min_claim / cfg.units.PCX, 'PCX');
  console.log('min_vote', min_vote / cfg.units.PCX, 'PCX');

  try {
    const wsProvider = new WsProvider(process.env.chainx_ws_addr);
    const api = await ApiPromise.create(options({ provider: wsProvider }));
    await api.isReady;

    const lastHeader = await api.rpc.chain.getHeader();
    console.log(curTime(), `last block #${lastHeader.number}`);
    console.log();

    const keyring = new Keyring({ type: 'ed25519', ss58Format: 44 });
    sender = keyring.addFromUri(cfg.accouts[accName]);
    accaddr = sender.address;
    console.log('Sender Addr is:', accaddr);
    // console.log(`Sender address ${sender.address} with publicKey [${u8aToHex(sender.publicKey)}]`);

    await dispatch(api, {"prev_action": "init", "prev_success": true});
  } catch (err) {
    console.log(curTime(), err);
    await dispatch(api, {"prev_action": "init", "prev_success": false});
  }
}

main();
