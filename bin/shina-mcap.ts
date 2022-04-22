#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ShinaMcapStack } from '../lib/shina-mcap-stack';

const app = new cdk.App();
new ShinaMcapStack(app, 'ShinaMcapV2');
