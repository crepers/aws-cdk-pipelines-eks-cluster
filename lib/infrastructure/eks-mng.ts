import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';


export interface EksManagedNodeGroupProps {
  cluster: eks.Cluster;
  nameSuffix: string;
}

export class EksManagedNodeGroup extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: EksManagedNodeGroupProps
  ) {
    super(scope, id);

    const lt = new ec2.CfnLaunchTemplate(this, "SSMLaunchTemplate", {
      launchTemplateData: {
        instanceType: "t3a.medium",
        tagSpecifications: [
          {
            resourceType: "instance",
            tags: [
              { key: "Name", value: `app-${props.nameSuffix}` },
              { key: "Environment", value: props.nameSuffix },
            ],
          },
          {
            resourceType: "volume",
            tags: [{ key: "Environment", value: props.nameSuffix }],
          },
        ],
      },
    });

    const nodeRole = new iam.Role(this, "EksNodeRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    nodeRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy")
    );
    nodeRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonEC2ContainerRegistryReadOnly"
      )
    );
    nodeRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    props.cluster.addNodegroupCapacity("app-ng", {
      launchTemplateSpec: {
        id: lt.ref,
        version: lt.attrLatestVersionNumber,
      },
      minSize: 3,
      maxSize: 6,
      amiType: eks.NodegroupAmiType.AL2_X86_64,
      nodeRole: nodeRole,
    });
  }
}
