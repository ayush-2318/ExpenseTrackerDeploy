import * as cdk from 'aws-cdk-lib';
import { CfnEIP, CfnInternetGateway, CfnNatGateway, CfnRoute, CfnVPCGatewayAttachment, Subnet, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ExpenseTrackerDeployCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc=new Vpc(this,"myVpc",{
      vpcName: "expenseTracker",
      cidr: "10.0.0.0/16",
      maxAzs: 2,
      natGateways:2,
      createInternetGateway: false,
      subnetConfiguration: [
       
        {
          cidrMask:24,
          name: "public-subnet",
          subnetType: SubnetType.PUBLIC
        },

        {
          cidrMask:24,
          name: "private-subnet",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS
          
        }

        
      ]
    });

    const internetGateway = new CfnInternetGateway(this, "InternetGateway");
    new CfnVPCGatewayAttachment(this,"MyUniqueVPCGatewayAttachment",{
      vpcId:vpc.vpcId,
      internetGatewayId:internetGateway.ref
    });

    const natGatewayOne= new CfnNatGateway(this,"NatGatewayOne",{
      subnetId:vpc.publicSubnets[0].subnetId,
      allocationId: new CfnEIP(this,"EIPForNatGatewayOne").attrAllocationId
    });

    const natGatewayTwo= new CfnNatGateway(this,"NatGatewayTwo",{
      subnetId:vpc.publicSubnets[1].subnetId,
      allocationId: new CfnEIP(this,"EIPForNatGatewayTwo").attrAllocationId
    });

    vpc.privateSubnets.forEach((subnet,index)=>{
      new CfnRoute(this,`PrivataeRouteToNatGateway-${index}`,{
        routeTableId:subnet.routeTable.routeTableId,
        destinationCidrBlock:'0.0.0.0/0',
        natGatewayId: index==0?natGatewayOne.ref:natGatewayTwo.ref
      })
    });

    
    vpc.publicSubnets.forEach((subnet,index)=>{
      new CfnRoute(this,`PublicRouteToNatGateway-${index}`,{
        routeTableId:subnet.routeTable.routeTableId,
        destinationCidrBlock:'0.0.0.0/0',
        gatewayId: internetGateway.ref
      })
    });

    new cdk.CfnOutput(this,'VPCIdOuptut',{
      value:vpc.vpcId,
      exportName:'VpcId'
    });

    vpc.publicSubnets.forEach((subnet,index)=>{
      new cdk.CfnOutput(this,`PublicSubnetOutput-${index}`,{
        value:subnet.subnetId,
        exportName:`PublicSubnet-${index}`
      });
    });

     vpc.privateSubnets.forEach((subnet,index)=>{
      new cdk.CfnOutput(this,`PrivateSubnetOutput-${index}`,{
        value:subnet.subnetId,
        exportName:`PrivateSubnet-${index}`
      });
    });

  }
}
