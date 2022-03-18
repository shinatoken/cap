import * as fs from 'fs';
import { Readable } from 'stream';
const glob = require('glob');

/**
 * Verify all envs defined
 */
export function verifyConfig() {
    
    if(process.env.INFURA_PROJ_ID === undefined) {
        throw new Error('Env var INFURA_PROJ_ID not found. Aborting.')
    }

    if(process.env.BUCKET_NAME === undefined) {
        throw new Error('Env var BUCKET_NAME not defined. Aborting!')
    }
}

/**
 * Finds all files matching regex and returns a map with format:
 * [fileName, fileContents: string]
 */
export function getAllMatchingFileContents(regex: string): Map<string, any> {

    const files: string[] = glob.sync(__dirname + regex)

    return new Map(files.map(file => {

        // Just want the file name and then make sure it was found
        const fileName = file.split('\\').pop()!.split('/').pop()
        if (fileName === undefined) {
        throw new Error(`Failed to parse filename ${file}`)
        }

        console.log(`Found file: ${fileName}`)

        return [
            fileName, 
            fs.readFileSync(file,'utf8'),
        ]
    }))
}

export function streamToString (stream: Readable | ReadableStream<any> | Blob): Promise<string> {

    const inputData = stream as Readable

    const chunks: Uint8Array[] | Buffer[] = [];
    return new Promise((resolve, reject) => {
        inputData.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        inputData.on('error', (err) => reject(err));
        inputData.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
}
