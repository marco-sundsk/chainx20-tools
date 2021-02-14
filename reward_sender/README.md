# reward_sender

## build
```shell
$>. build.sh
```
## config
* config.json  
    sender and targets, amounts and remarks of reward,
* .env  
    ChainX node backend URL

### about formation of address list in config.json

```shell
# find:
^(.+)$
# replace with: 
{"addr": "$1", "amount": 100000000, "remark": "reward1"},
```
### verify_addr
using keyring.decodeAddress to do verification.
### do_reward_sender
send reward according to config.json