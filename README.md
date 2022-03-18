# ShinaToken Stats Lambda (CDK + TypeScript)

This project utilizes infura and web3js to pull information about Ethereum and Shina Token and writes that info to a file in an S3 bucket. The files generated are for the current timestamp, the latest , and an aggregate of the year's data.

## Useful commands

* `npm ci`          Pull dependencies using package-lock.json
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
