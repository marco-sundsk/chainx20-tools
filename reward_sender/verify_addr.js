'use strict';

const cfg = require("./config");
const {Keyring} = require("@polkadot/api");

function main() {
    console.log('Verify addrs, version: 0.1.0');
    console.log('');

    let problems = [];
    let total_amount = 0;
    const keyring = new Keyring({ type: 'sr25519' });
    for (let i=0;i<cfg.receivers.length;i++) {
        process.stdout.write("Verify target Addr[" + (i+1) + "]: " + cfg.receivers[i]['addr']);

        try {
            if (!cfg.receivers[i]['addr'].startsWith("5")) {
                throw "Illegal Addr"
            }
            let pk = keyring.decodeAddress(cfg.receivers[i]['addr']);
            total_amount += cfg.receivers[i]['amount'];
            console.log("...OK.");
        } catch(err) {
            console.log("...Failed!");
            problems.push(i);
        }
    }

    if (problems.length > 0) {
        console.log("Following addr has problems:");
        for (let i=0;i<problems.length;i++) {
            let index = problems[i];
            console.log("No."+ (index+1) + ", Addr:" + cfg.receivers[index]['addr']);
        }
    }

    console.log('Verify addrs, End: Legal count:' + (cfg.receivers.length - problems.length));
    console.log('Total amount is:', total_amount/10**8);
}

main();
