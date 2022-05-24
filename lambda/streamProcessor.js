const AWS = require('aws-sdk');
var s3 = new AWS.S3();
var sqs = new AWS.SQS({
  region: process.env.AWS_REGION
});

exports.handler = function(event, context) {
  console.log('Function fired successfully');
  
  event.Records.forEach((record) => {
      /**
       * This is where we need to transform the event, offload the request
       * to S3, generate metadata around the outbound request, and finally write
       * it to SQS FIFO
       */
      console.log('Record: %j', record);
      console.log("Writing event to S3");
      var params = {
        Bucket : process.env.BUCKET_NAME,
        Key : record.eventID,
        Body : JSON.stringify(record)
      }
      s3.putObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else
        {
          console.log(data);          // successful response
          
        }
      });
      console.log("Finished writing event to S3");
      console.log("Writing event to SQS");

      var messageBody = {
        Bucket : process.env.BUCKET_NAME,
        Key: record.eventID,
        ApproxArrivalTimestamp: record.kinesis.approximateArrivalTimestamp
      };
      var params = {
        MessageBody: JSON.stringify(messageBody),
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageGroupId: record.kinesis.partitionKey,
        MessageDeduplicationId: record.eventID
      };
      //Send message to SQS queue
      sqs.sendMessage(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else
        {
          console.log(data); // successful response
        }
      });
      console.log(`Message acknowledge received from the queue ${process.env.SQS_QUEUE_URL}`);
  });
  console.log('Function completed successfully');
};