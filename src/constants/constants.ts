import { ethers } from "ethers";
import { Transaction } from "../types";

///@dev mainnet deployed addresses.
import { address as mainnetFactory } from "../deployments/mainnet/LaserFactory.json";
import { address as mainnetHelper } from "../deployments/mainnet/LaserHelper.json";
import { address as mainnetModule } from "../deployments/mainnet/LaserModuleSSR.json";

///@dev goerli deployed addresses.
import { address as goerliFactory } from "../deployments/goerli/LaserFactory.json";
import { address as goerliHelper } from "../deployments/goerli/LaserHelper.json";
import { address as goerlissrModule } from "../deployments/goerli/LaserModuleSSR.json";
import { address as goerliVault } from "../deployments/goerli/LaserVault.json";
import { address as goerliRegistry } from "../deployments/goerli/LaserRegistry.json";

///@dev kovan deployed addresses.
import { address as kovanFactory } from "../deployments/kovan/LaserFactory.json";
import { address as kovanHelper } from "../deployments/kovan/LaserHelper.json";
import { address as kovanModule } from "../deployments/kovan/LaserModuleSSR.json";

///@dev ropsten deployed addresses.
import { address as ropstenFactory } from "../deployments/ropsten/LaserFactory.json";
import { address as ropstenHelper } from "../deployments/ropsten/LaserHelper.json";
import { address as ropstenModule } from "../deployments/ropsten/LaserModuleSSR.json";

///@dev localhost deployed addresses.
import { address as localhostFactory } from "../deployments/localhost/LaserFactory.json";
import { address as localhostHelper } from "../deployments/localhost/LaserHelper.json";
import { address as localhostssrModule } from "../deployments/localhost/LaserModuleSSR.json";
import { address as localhostVault } from "../deployments/localhost/LaserVault.json";
import { address as localhostRegistry } from "../deployments/localhost/LaserRegistry.json";

export const ZERO = ethers.constants.AddressZero;

export const MAGIC_VALUE = "0x1626ba7e";

export const emptyTransaction: Transaction = {
    to: "",
    value: "",
    callData: "",
    nonce: "",
    maxFeePerGas: "",
    maxPriorityFeePerGas: "",
    gasLimit: "",
    relayer: ethers.constants.AddressZero,
    signatures: "",
};

export const DEPLOYED_ADDRESSES = {
    "1": {
        laserFactory: mainnetFactory,
        laserHelper: mainnetHelper,
        laserModuleSSR: mainnetModule,
    },
    "5": {
        laserFactory: goerliFactory,
        laserHelper: goerliHelper,
        laserModuleSSR: goerlissrModule,
        laserVault: goerliVault,
        laserRegistry: goerliRegistry,
    },
    "42": {
        laserFactory: kovanFactory,
        laserHelper: kovanHelper,
        laserModuleSSR: kovanModule,
    },
    "3": {
        laserFactory: ropstenFactory,
        laserHelper: ropstenHelper,
        laserModuleSSR: ropstenModule,
    },
    "31337": {
        laserFactory: localhostFactory,
        laserHelper: localhostHelper,
        laserModuleSSR: localhostssrModule,
        laserVault: localhostVault,
        laserRegistry: localhostRegistry,
    },
};
