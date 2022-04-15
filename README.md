# ShinaToken Stats Lambda 

This AWS CDK and Typescript project utilizes Infura, web3js, AWS Lambda and AWS S3 to regularly pull information about Ethereum and Shina Token (My ERC20 Token). The data retrieved throughout the day is written to a file in a public S3 bucket. The files generated are for the current timestamp, the latest, and an aggregate of the year's data.

I hope you find this useful and please do not hesitate to reach out through social media if you have any questions: https://shinatoken.com

Happy to help. 💕💕🥰🥰💕💕

## Useful commands

* `npm ci`          Pull dependencies using package-lock.json
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
