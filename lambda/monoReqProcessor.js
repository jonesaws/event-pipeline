const aws = require('aws-sdk');
var kinesis = new aws.Kinesis();

exports.handler = async (event, context) => {
  console.log('Function fired successfully'); 
  console.log('Received event:', JSON.stringify(event, null, 2));
  var params = {
        Data: Buffer.from(event + "") || 'STRING_VALUE',
        PartitionKey: 'STRING_VALUE', 
        StreamName: process.env.STREAM_NAME,
  };
  const res = await kinesis.putRecord(params).promise();
  console.log('Function completed successfully'); 
  return {
    statusCode: 200,
  };
};