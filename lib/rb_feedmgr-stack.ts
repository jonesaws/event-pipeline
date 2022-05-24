import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources'
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Architecture } from 'aws-cdk-lib/aws-lambda';

export class RbFeedmgrStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stream = new kinesis.Stream(this, 'EventStream');

    const reqQueue = new sqs.Queue(this, 'RbFeedmgrQueue', {
      visibilityTimeout: Duration.seconds(10),
      fifo: true
    });

    const dlQueue = new sqs.Queue(this, 'RbFeedmgrDlq', {
      visibilityTimeout: Duration.seconds(60),
    });

    const requestS3Bucket = new s3.Bucket(this, 'RequestBucket');

    /**
     * Lambda for processing API Gateway requests
     */
    const monoEventLambda = new lambda.Function(this, 'MonoReqHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      architecture: Architecture.ARM_64,
      handler: 'monoReqProcessor.handler', // file is "monoReqProcessor.js", function is "handler",
      environment: {
        STREAM_NAME: stream.streamName
      },
      deadLetterQueue: dlQueue,
      deadLetterQueueEnabled: true,
      logRetention: 1,
      tracing: lambda.Tracing.ACTIVE
    });

    const restApi = new apigw.LambdaRestApi(this, 'Endpoint', {
      handler: monoEventLambda
    });    

    /**
     * Lambda for processing the Kinesis Stream
     */
    const streamProcessingLambda = new lambda.Function(this, 'StreamHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      architecture: Architecture.ARM_64,
      handler: 'streamProcessor.handler', // file is "streamProcessor.js", function is "handler",
      environment: {
        SQS_QUEUE_URL: reqQueue.queueUrl,
        BUCKET_NAME: requestS3Bucket.bucketName
      },
      deadLetterQueue: dlQueue,
      deadLetterQueueEnabled: true,
      logRetention: 1,
      tracing: lambda.Tracing.ACTIVE
    });

    const eventKinesisSource = new lambdaEventSources.KinesisEventSource(stream, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    });
    streamProcessingLambda.addEventSource(eventKinesisSource);

    /**
     * Lambda for processing the outbound requests from SQS
     */
    const requestProcessingLambda = new lambda.Function(this, 'RequestHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      architecture: Architecture.ARM_64,
      handler: 'requestProcessor.handler', // file is "requestProcessor.js", function is "handler",
      deadLetterQueue: dlQueue,
      deadLetterQueueEnabled: true,
      logRetention: 1,
      tracing: lambda.Tracing.ACTIVE
    });   
    
    const requestSqsSource = new lambdaEventSources.SqsEventSource(reqQueue, {
    });
    requestProcessingLambda.addEventSource(requestSqsSource);
    
    /**
     * Grant the required permissions to resources
     */
    reqQueue.grantConsumeMessages(requestProcessingLambda);
    reqQueue.grantSendMessages(streamProcessingLambda);
    dlQueue.grantSendMessages(monoEventLambda);
    dlQueue.grantSendMessages(streamProcessingLambda);
    dlQueue.grantSendMessages(requestProcessingLambda);
    requestS3Bucket.grantPut(streamProcessingLambda);
    requestS3Bucket.grantRead(requestProcessingLambda);
    stream.grantWrite(monoEventLambda);
  }
}
