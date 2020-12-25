'use strict';

require("dotenv").config();
const cfg = require("./config");
const curTime = require("./util_time");

const { ApiPromise } = require("@polkadot/api");
const { WsProvider } = require("@polkadot/rpc-provider");
const { options } = require("@chainx-v2/api");

async function main() {
    console.log(curTime(), 'Mining report for ChainX20. Version: 0.9.1');
    console.log('Env is:');
    console.log('chainx_ws_addr:', process.env.chainx_ws_addr);
    console.log('Cfg is:');
    console.log('ref account:', cfg.account);
    console.log('');

    const account = cfg.account;

    const wsProvider = new WsProvider(process.env.chainx_ws_addr);
    const api = await ApiPromise.create(options({ provider: wsProvider }));
    await api.isReady;

    const lastHeader = await api.rpc.chain.getHeader();
    console.log(curTime(), `last block #${lastHeader.number}`);

    // get X-BTC to be claimed: xmining.toJSON()['1']['other']*10
    const xmining = await api.rpc.xminingasset.getDividendByAccount(account);
    // console.log(xmining.toJSON());
    let xbtc_profit = parseInt(xmining.toJSON()['1']['own']);
    console.log(curTime(), '0.01 xbtc_profit:', xbtc_profit);

    // get PCX staking to be claimed: 
    const staking = await api.rpc.xstaking.getDividendByAccount(account);
    // console.log(staking.toJSON());
    const stakingObj = staking.toJSON();
    let pcx_profit = 0;
    for(var validator in stakingObj) {
      // console.log(validator, ": ", stakingObj[validator]);
      pcx_profit += parseInt(stakingObj[validator]);
    }
    console.log(curTime(), '100 pcx_profit:', pcx_profit);

    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
