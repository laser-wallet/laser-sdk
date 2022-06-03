# Laser Wallet SDK

### SDK to interact with a Laser wallet.

## Usage

```
npm i laser-sdk
```

### Import with TypeScript:
```ts
import { ethers } from "ethers";
import { Laser, LaserFactory } from "laser-sdk";
```

### Import with JavScript:
```js
const { ethers } = require("ethers");
const { Laser, LaserFactory } = require("laser-sdk");
```

### Examples:
```ts
import { ethers } from "ethers";
import { Laser, LaserFactory} from "laser-sdk";

const providerUrl = "https://goerli.infura.io/v3/your-key";
const owner =  new ethers.Wallet("owner pk");
const addr = "laser wallet address";

const laser = new Laser(providerUrl, owner, addr, "");


async function main(): Promise<void> {
    const walletVersion = await laser.getVersion();
    const walletNonce = await laser.getNonce();
    const networkId = await laser.getNetworkId();
    const guardians = await laser.getGuardians();


    console.log("wallet version: ", walletVersion);
    console.log("wallet nonce: ", walletNonce);
    console.log("network id: ", networkId);
    console.log("guardians: ", guardians);
}
```


## License

#### LGPL-3.0 License.

## Open-source software

#### We are strong believers of open-source software. 100% of Laser's code is open sourced.
