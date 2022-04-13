import { Construct } from 'constructs';
import { Aws, SecretValue, Stack, Stage, StackProps } from 'aws-cdk-lib';      
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CodePipeline, CodePipelineSource, ShellStep, ManualApprovalStep } from 'aws-cdk-lib/pipelines';
import { EksClusterStage } from "./eks-cluster-stage";
import { AppDnsStage } from "./app-dns-stage";


export class EksPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, "Pipeline", {
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.gitHub(
          "crepers/aws-cdk-pipelines-eks-cluster",
          "main",
          {
            authentication:
              SecretValue.secretsManager("github-oauth-token"),
          }
        ),
        commands: ["npm ci", "npm run build", "npx cdk synth"],
      }),
      pipelineName: "EKSClusterBlueGreen",
    });

    const clusterANameSuffix = "blue";
    const clusterBNameSuffix = "green";

    const eksClusterStageA = new EksClusterStage(this, "EKSClusterA", {
      clusterVersion: eks.KubernetesVersion.V1_20,
      nameSuffix: clusterANameSuffix,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });

    const eksClusterStageB = new EksClusterStage(this, "EKSClusterB", {
      clusterVersion: eks.KubernetesVersion.V1_21,
      nameSuffix: clusterBNameSuffix,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });

    const eksClusterWave = pipeline.addWave("DeployEKSClusters");

    const domainName = ssm.StringParameter.valueForStringParameter(
      this,
      "/eks-cdk-pipelines/zoneName"
    );

    eksClusterWave.addStage(eksClusterStageA, {
      post: [
        new ShellStep("Validate App", {
          commands: [
            `for i in {1..12}; do curl -Ssf http://echoserver.${clusterANameSuffix}.${domainName} && echo && break; echo -n "Try #$i. Waiting 10s...\n"; sleep 10; done`,
          ],
        }),
      ],
    });

    eksClusterWave.addStage(eksClusterStageB, {
      post: [
        new ShellStep("Validate App", {
          commands: [
            `for i in {1..12}; do curl -Ssf http://echoserver.${clusterBNameSuffix}.${domainName} && echo && break; echo -n "Try #$i. Waiting 10s...\n"; sleep 10; done`,
          ],
        }),
      ],
    });

    const prodEnv = clusterBNameSuffix;

    const appDnsStage = new AppDnsStage(this, "UpdateDNS", {
      envName: prodEnv,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });

    pipeline.addStage(appDnsStage, {
      pre: [new ManualApprovalStep(`Promote-${prodEnv}-Environment`)],
    });
  }
}
