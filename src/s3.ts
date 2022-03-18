import { MarketData } from "./shinacap";
import { GetObjectCommand, GetObjectCommandInput, GetObjectCommandOutput, PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { streamToString } from "./utils";

// Configure S3
const client = new S3Client({region: 'us-east-1'});
const BUCKET_NAME = process.env.BUCKET_NAME ?? 'shinatoken.com'
const BUCKET_FOLDER = process.env.BUCKET_FOLDER ?? 'shinacap'
const OBJ_TYPE = 'application/json'

if(BUCKET_NAME === undefined) {
  throw new Error('Env var BUCKET_NAME not defined. Aborting!')
}

/**
 * Reads a file from s3
 */
export async function readDataFromS3(fileName: string): Promise<MarketData[] | undefined> {
  console.log(`readDataFromS3: ${fileName}`)

  let rtnData: MarketData[] | undefined = undefined

  const key = `${BUCKET_FOLDER}/${fileName}`

  const cmd: GetObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key: key,
  }

  try{
    const data: GetObjectCommandOutput = await client.send(new GetObjectCommand(cmd));

    if (data && data.Body !== undefined && data.Body != null) {

      const strData = await streamToString(data.Body)
      rtnData = JSON.parse(strData) as MarketData[]

      console.log('Get Object Operation Completed with data: ' + strData.length)
    }
    else {
      console.warn(`Get object for file ${key} returned no contents.`)
    }

    // Don't print all data to log. Just the size of the array. Makes a mess.
    console.log("Success. Array size: ", rtnData?.length);
  } catch (err) {
    console.log(`Error. Error reading file ${key}`, err);
  }

  return rtnData
}

/**
 * Writes data to s3
 * @param fileContents Contents of the data
 */
export async function putObjectToS3(fileContents: string, fileName: string) {
  console.log(`putObjectToS3: ${fileName}`)

  if(BUCKET_NAME === undefined) {
    throw new Error('Env var BUCKET_NAME not defined. Aborting!')
  }

  try {

    const cmdInput: PutObjectCommandInput = {
        Bucket: BUCKET_NAME,
        Key: `${BUCKET_FOLDER}/${fileName}`,
        Body: fileContents,
        ContentType: OBJ_TYPE,
    }

    const rtn: PutObjectCommandOutput = await client.send(new PutObjectCommand(cmdInput))
    console.log('s3 return:' + JSON.stringify(rtn))

  } catch (error) {
    console.log("s3 error:" + error);
    throw error
  }
}