const AWS = require('aws-sdk');
var sqs = new AWS.SQS();
var s3 = new AWS.S3();

exports.handler = function(event, context) {
  event.Records.forEach(record => {
    console.log(JSON.stringify(record));
    var body = JSON.parse(record.body);
    console.log("Parsed body: " + JSON.stringify(body));
    const params = {
      Bucket: body.Bucket,
      Key: body.Key
      };
      s3.getObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });
      console.log("Successfully processed");
  });
  return {};
}