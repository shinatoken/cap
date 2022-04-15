/**
 * Verify all envs defined
 */
export function verifyConfig() {
    if (process.env.INFURA_PROJ_ID === undefined) {
        throw new Error('Env var INFURA_PROJ_ID not found. Aborting.');
    }
}