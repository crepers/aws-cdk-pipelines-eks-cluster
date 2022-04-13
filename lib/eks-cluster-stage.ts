import { Construct } from 'constructs';
import { Aws, Environment, Stack, Stage, StackProps } from 'aws-cdk-lib';      
import * as eks from 'aws-cdk-lib/aws-eks';

import { EksClusterStack } from "./eks-cluster-stack";

export interface EksClusterStageProps extends StackProps {
  clusterVersion: eks.KubernetesVersion;
  nameSuffix: string;
  env: Environment;
}

export class EksClusterStage extends Stage {
  constructor(scope: Construct, id: string, props: EksClusterStageProps) {
    super(scope, id, props);

    new EksClusterStack(this, "EKSCluster", {
      tags: {
        Application: "EKSCluster",
        Environment: id,
      },
      clusterVersion: props.clusterVersion,
      nameSuffix: props.nameSuffix,
      env: props.env,
    });
  }
}
