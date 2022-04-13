#!/usr/bin/env node
import 'source-map-support/register';
import { Construct } from 'constructs';
import { App } from 'aws-cdk-lib';          
import { EksPipelineStack } from '../lib/eks-pipeline-stack';

const app = new App();
new EksPipelineStack(app, 'EksPipelineStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

app.synth()
