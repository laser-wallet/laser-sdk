# Laser Wallet SDK

### SDK to interact with a Laser wallet.

## Usage: 

```js
import { Laser } from "laser-sdk";

const owner = new ethers.Wallet(pk);
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletAddress = "0x..";
const LASER_MODULE = "0x..";
const LASER_HELPER = "0X..";

const laser = new Laser(provider, owner, walletAddress, LASER_MODULE, LASER_HELPER);


// Gets the state
await laser.getWalletState();

```

## Building: 

```
npm i
```
### Generate types: 

```
npm run generate-types
```

## License

#### LGPL-3.0 License.

## Open-source software

#### We are strong believers of open-source software. 100% of Laser's code is open sourced.