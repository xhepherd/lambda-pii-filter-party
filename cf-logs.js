/* eslint-disable no-console */
const AWS = require('aws-sdk');
const zlib = require('zlib');

let s3;
let logsObjectKey;
let logsBucket;
let logsBucketParams;
let filteredLogsObjectKey;

function zipLogs(data) {
  return zlib.gzipSync(data);
}

function unZipLogs(gzdata) {
  return zlib.gunzipSync(gzdata).toString();
}

function processLogs(logs) {
  return zipLogs(removePII(unZipLogs(logs)));
}

/**
 * Format key name
 * @param {string} key
 * * Receives logs object key, example input cf-logs-unfiltered/E26VN48UO6YOQH.2019-01-25-12.51a1005c.gz
 * @returns {string}
 * * file name with structure which Athena can process faster by partitioning
 * * example output cf-logs-filtered/year=2019/month=01/day=25/hour=12/distribution=E26VN48UO6YOQH/51a1005c.gz
 */
function formatKeyName(key) {
  const filteredLogsPrefix = process.env.FILTERED_LOGS_PREFIX;
  const unfilteredLogsPrefix = process.env.UNFILTERED_LOGS_PREFIX;
  const regex = new RegExp(`${unfilteredLogsPrefix}(\\w*).(\\d{4})-(\\d{2})-(\\d{2})-(\\d{2}).(\\w*.gz)`);
  return key.replace(regex, `${filteredLogsPrefix}year=$2/month=$3/day=$4/hour=$5/distribution=$1/$6`);
}

function getLogsObject() {
  return s3.getObject(logsBucketParams).promise();
}

function deleteLogsObject() {
  return s3.deleteObject(logsBucketParams).promise();
}

function putProcessedLogsObject(body, objectKey) {
  return s3.putObject({
    ContentType: 'binary',
    ContentEncoding: 'utf8',
    ServerSideEncryption: 'aws:kms',
    SSEKMSKeyId: process.env.KMS_KEY_ID,
    Body: body,
    Key: objectKey,
    Bucket: logsBucket,
  }).promise();
}

function isLogsObjectProcessed(objectKey) {
  return s3.headObject({
    Key: objectKey,
    Bucket: logsBucket,
  }).promise();
}

exports.handler = function handler(event, context, callback) {
  if (!event.Records[0].s3.object) {
    callback('Not an S3 object event', 'ERROR');
    return false;
  }
  s3 = new AWS.S3();
  logsObjectKey = event.Records[0].s3.object.key;
  logsBucket = event.Records[0].s3.bucket.name;
  logsBucketParams = {
    Key: logsObjectKey,
    Bucket: logsBucket,
  };
  filteredLogsObjectKey = formatKeyName(logsObjectKey);

  return getLogsObject()
    .then(data => putProcessedLogsObject(processLogs(data.Body), filteredLogsObjectKey))
    .then(() => deleteLogsObject())
    .then(() => callback(null, 'success'))
    .catch(error => {
      if (typeof error.statusCode !== 'undefined' && error.statusCode === 403) { // AccessDenied
        return isLogsObjectProcessed(filteredLogsObjectKey)
          .then(() => callback(null, 'DuplicateEvent'))
          .catch((err) => callback(`ERROR:${err.code}:AccessDenied:${filteredLogsObjectKey}`));
      } else {
        callback(`ERROR:${error.code}:${logsObjectKey}`);
      }
    });
};
