import { ethers } from "ethers";
import { Address, Transaction } from "../types";

/**
 * @dev Mainnet deployed addresses.
 */
// import { address as mainnetFactory } from "../deployments/mainnet/LaserFactory.json";
// import { address as mainnetHelper } from "../deployments/mainnet/LaserHelper.json";

/**
 * @dev Goerli deployed addresses.
 */
import { address as goerliFactory } from "../deployments/goerli/LaserFactory.json";
import { address as goerliHelper } from "../deployments/goerli/LaserHelper.json";

/**
 * @dev Kovan deployed addresses.
 */
import { address as kovanFactory } from "../deployments/kovan/LaserFactory.json";
import { address as kovanHelper } from "../deployments/kovan/LaserHelper.json";

/**
 * @dev Ropsten deployed addresses.
 */
import { address as ropstenFactory } from "../deployments/ropsten/LaserFactory.json";
import { address as ropstenHelper } from "../deployments/ropsten/LaserHelper.json";

/**
 * @dev Localhost deployed addresses.
 */
import { address as localhostFactory } from "../deployments/localhost/LaserFactory.json";
import { address as localhostHelper } from "../deployments/localhost/LaserHelper.json";

export const MAGIC_VALUE = "0x1626ba7e";

type DeployedAddresses = {
    laserFactory: Address;
    laserHelper: Address;
};
export function getDeployedAddresses(chainId: string): DeployedAddresses {
    switch (chainId) {
        case "1": {
            return {
                laserFactory: "",
                laserHelper: "",
            };
        }
        case "5": {
            return {
                laserFactory: goerliFactory,
                laserHelper: goerliHelper,
            };
        }
        case "42": {
            return {
                laserFactory: kovanFactory,
                laserHelper: kovanHelper,
            };
        }
        case "3": {
            return {
                laserFactory: ropstenFactory,
                laserHelper: ropstenHelper,
            };
        }
        case "31337": {
            return {
                laserFactory: localhostFactory,
                laserHelper: localhostHelper,
            };
        }
        default: {
            throw Error("Unsupported network.");
        }
    }
}
