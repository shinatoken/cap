import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as events from 'aws-cdk-lib/aws-events';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

require('dotenv').config()

const BUCKET_NAME = 'shinatoken.com'
const BUCKET_ARN = `arn:aws:s3:::${BUCKET_NAME}`
const BUCKET_FOLDER = 'shinacap'
const PROJECT_NAME = 'ShinaToken'
const MAIN_FILE = `/../src/shinacap.ts`

export class ShinaMcapStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.verifyEnv()

    // Create Function
    const func = this.createFunction()

    // Setup event trigger
    this.createEventCaller(func)
    
    // Create Bucket - Not used for now. Using existing bucket.
    this.setupBucket(func)
  }

  /** 
   * 
   */
  private createFunction(): NodejsFunction {
    return new NodejsFunction(this, 'function', {
      memorySize: 512,
      timeout: Duration.seconds(5),
      runtime: Runtime.NODEJS_14_X,
      logRetention: RetentionDays.FIVE_DAYS,
      handler: 'main',
      entry: path.join(__dirname, MAIN_FILE),
      environment: {
        INFURA_PROJ_ID: process.env.INFURA_PROJ_ID ?? '', // This is verified in verifyEnv()
        BUCKET_NAME: BUCKET_NAME,
        BUCKET_FOLDER: BUCKET_FOLDER,
      },

      // Add extra files to the lambda distribution
      bundling: {
        externalModules: [
          'aws-sdk',  // Use the 'aws-sdk' available in the Lambda runtime
          'electron', // not used.
        ],
        commandHooks: {
          beforeBundling() {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {

            console.log(`input dir: ${inputDir}`);
            console.log(`input dir: ${outputDir}`);

            return [
              `mkdir ${outputDir}/abis`,
              `cp ${inputDir}/src/abis/*.json ${outputDir}/abis/.`
            ];
          },
          beforeInstall() {
            return []
          },
        },
      },
    })
  }

  /**
   * 
   */
  private setupBucket(func: NodejsFunction) {
    // Uncomment to use a new bucket. You will also need to update the policy below.
    // const myBucket = new Bucket(this, 'booket', {
    //   bucketName: 'MYBUCKETNAME',
    // });

    const existingBucket = Bucket.fromBucketArn(this, 'existingBucket', BUCKET_ARN)

    // Add permission to access bucket
    const s3ListBucketsPolicy = new PolicyStatement({
      actions: [
        's3:List*',
        's3:Put*',
        's3:Update*',
        's3:Get*',
        's3:Del*',
      ],
      // Only allow to write to a specific folder in the bucket:
      resources: [existingBucket.bucketArn, `${existingBucket.bucketArn}/${BUCKET_FOLDER}/*`],
    })

    func.role?.attachInlinePolicy(
      new Policy(this, 'list-buckets-policy', {
        statements: [s3ListBucketsPolicy],
      })
    )
    
    func.addEnvironment('BUCKET_NAME', existingBucket.bucketName)
  }


  /**
   * 
   */
  private createEventCaller(func: NodejsFunction) {
    const eventRule = new events.Rule(this, "fiveMinuteRule", {
      schedule: events.Schedule.cron({ minute: "0/5" }),
    });

    // add the Lambda function as a target for the Event Rule
    eventRule.addTarget(
      new targets.LambdaFunction(func, {
        event: events.RuleTargetInput.fromObject({ message: `Hello ${PROJECT_NAME} Lambda` }),
      })
    );

    // allow the Event Rule to invoke the Lambda function
    targets.addLambdaPermission(eventRule, func)
  }

  private verifyEnv() {
    if(process.env.INFURA_PROJ_ID === undefined) {
      throw new Error('Cannot find env var INFURA_PROJ_ID. Aborting.')
    }
  }
}
