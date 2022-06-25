/**
 * All external functions for Laser.
 */
export const LASER_FUNCS = {
    init: "init",
    exec: "exec",
    simulateTransaction: "simulateTransaction",
    operationHash: "operationHash",
    isValidSignature: "isValidSignature",
    getChainId: "getChainId",
    domainSeparator: "domainSeparator",
    changeOwner: "changeOwner",
    changeRecoveryOwner: "changeRecoveryOwner",
    upgradeSingleton: "upgradeSingleton",
    lock: "lock",
    unlock: "unlock",
    recoveryUnlock: "recoveryUnlock",
    unlockGuardians: "unlockGuardians",
    recover: "recover",
    addGuardian: "addGuardian",
    removeGuardian: "removeGuardian",
    isGuardian: "isGuardian",
    getGuardians: "getGuardians",
    returnSigner: "returnSigner",
    splitSigs: "splitSigs",
};

/**
 * All external functions for Laser Factory.
 */
export const FACTORY_FUNCS = {
    createProxy: "createProxy",
    createProxyWithNonce: "createProxyWithNonce",
    preComputeAddress: "preComputeAddress",
    proxyRuntimeCode: "proxyRuntimeCode",
    proxyCreationCode: "proxyCreationCode",
};
