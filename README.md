# Laser Wallet SDK

### SDK to interact with a Laser wallet.

## Usage:


```js
import { Laser, LaserFactory } from "laser-sdk";

async function laserExample() {
    const provider = new ethers.providers.JsonRpcProvider("ke..");

    const walletAddress = "0x...";

    const signer = new ethers.Wallet("private key..");

    const laser = new Laser(provider, signer, walletAddress);

    // initialize the sdk. 
    await laser.init();

    // get state
    await laser.getWalletState();

    // send eth (get tx object so the relayer can forward it)
    await laser.sendEth(signer.address, 0.1, txInfo);
}


async function factoryExample() {
    const provider = new ethers.providers.JsonRpcProvider("ke..");

    // wallet owner
    const signer = new ethers.Wallet("private key..");

    const factory = new LaserFactory(provider, signer);

    // init the factory
    await factory.init();

    const gasLimit = 500000;
    const recoveryOwners = ["0x.."];
    const guardians = ["0x.."];

    // 0 while using infura's relayer
    const maxFeePerGas = 0;
    const maxPriorityFeePerGas = 0;
    const salt = "random number per user..";

    const preComputeAddress = await factory.preComputeAddress(signer.address, recoveryOwners, guardians, salt);
    console.log("address: ", preComputeAddress);

    const result = await factory.createWallet(
            signer.address,
            recoveryOwners,
            guardians,
            maxFeePerGas,
            maxPriorityFeePerGas,
            gasLimit,
            salt,
            signer.address
    );
}

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