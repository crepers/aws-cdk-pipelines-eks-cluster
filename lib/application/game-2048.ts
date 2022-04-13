import * as yaml from 'js-yaml';
import request from 'sync-request';

import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';


export interface Game2048Props {
  cluster: eks.Cluster;
}

export class Game2048 extends Construct {
  constructor(scope: Construct, id: string, props: Game2048Props) {
    super(scope, id);
    
    const manifestUrl = 'https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/examples/2048/2048_full.yaml';
    const manifest = yaml.loadAll(request('GET', manifestUrl).getBody().toString());
    props.cluster.addManifest('game-2048', manifest);
  }
}
