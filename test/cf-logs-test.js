/* eslint-disable import/no-unresolved, import/no-extraneous-dependencies */
const fs = require('fs');
const zlib = require('zlib');
const sinon = require('sinon');
const assert = require('assert');
const awsMock = require('aws-sdk-mock');
/* eslint-enable import/no-unresolved, import/no-extraneous-dependencies */

function resolvePromise(data) {
  return new Promise((resolve, reject) => resolve(data));
}
function rejectPromise(data) {
  return new Promise((resolve, reject) => reject(data));
}

describe('Process CF Logs Object Lambda handler', () => {
  let callback;
  let getObjectSpy;
  let putObjectSpy;
  let deleteObjectSpy;
  let headObjectSpy;
  let filteredLogs;
  let expectedMessage = 'success';
  const piiFiltered = 'code=[FILTERED]';
  const piiUnFiltered = 'code=asdfa';
  const passwordUnFiltered = 'aasdfasdftest';
  const kmsKeyId = '1234-abcd-5678-efgh';
  const logsObjectKey = 'cf-logs-unfiltered/EXAMPLE123456.2019-01-25-12.51a1005c.gz';
  const logsBucket = 'xv-web-frontend-cf-logs';
  const logsBucketParams = { Bucket: logsBucket, Key: logsObjectKey };
  const filteredLogFilePath = './test/files/filtered.gz';
  const filteredLogsObjectKey = 'cf-logs-filtered/year=2019/month=01/day=25/hour=12/distribution=EXAMPLE123456/51a1005c.gz';
  const zipRawLogs = Buffer.from(fs.readFileSync(`./test/files/${logsObjectKey}`));
  const rawLogs = zlib.gunzipSync(zipRawLogs).toString();
  const logsBucketProcessedParams = {
    ContentType: 'binary',
    ContentEncoding: 'utf8',
    ServerSideEncryption: 'aws:kms',
    SSEKMSKeyId: kmsKeyId,
    Body: '',
    Key: filteredLogsObjectKey,
    Bucket: logsBucket,
  };
  let getObjectResponse = resolvePromise({ Body: zipRawLogs });
  let headObjectResponse = resolvePromise({});
  let putSuccesCase = true;

  process.env = { UNFILTERED_LOGS_PREFIX: 'cf-logs-unfiltered/', FILTERED_LOGS_PREFIX: 'cf-logs-filtered/', KMS_KEY_ID: kmsKeyId };

  const cfLogs = require('./../cf-logs.min.js');
  const handler = cfLogs.handler;
  const removePII = cfLogs.removePII;
  const event = {
    Records: [{
      s3: {
        bucket: { name: logsBucket },
        object: { key: logsObjectKey },
      },
    }],
  };

  beforeEach(() => {
    callback = sinon.fake();
    getObjectSpy = sinon.spy((params, cb) => cb(null, getObjectResponse));
    headObjectSpy = sinon.spy((params, cb) => cb(null, headObjectResponse));
    putObjectSpy = sinon.spy((params, cb) => cb(null, new Promise((resolve, reject) => {
      if(putSuccesCase) {
        fs.writeFile(filteredLogFilePath, params.Body, (err) => {
          if (err) reject({ code: 'WriteFail', statusCode: 500 });
          resolve('saved!');
        });
      } else reject({ code: 'PutFailed', statusCode: 500 });
    })));
    deleteObjectSpy = sinon.spy((params, cb) => cb(null, resolvePromise('success')));
    // Mock AWS S3 Calls
    awsMock.mock('S3', 'getObject', getObjectSpy);
    awsMock.mock('S3', 'putObject', putObjectSpy);
    awsMock.mock('S3', 'deleteObject', deleteObjectSpy);
    awsMock.mock('S3', 'headObject', headObjectSpy);
  });

  afterEach(() => {
    getObjectResponse = resolvePromise({ Body: zipRawLogs });
    putSuccesCase = true;
    expectedMessage = 'success';
    awsMock.restore('S3');
  });

  const successCallbackCalled = done => () => {
    assert(callback.calledWith(null, expectedMessage));
  };

  const errorCallbackCalled = done => () => {
    assert(callback.calledWith(expectedMessage));
  };

  it('should remove PII from zipped logs', () => {
    handler(event, null, callback).then(() => {
      filteredLogs = zlib.gunzipSync(Buffer.from(fs.readFileSync(filteredLogFilePath))).toString();
      assert.notEqual(rawLogs.indexOf(piiUnFiltered), -1);
      assert.notEqual(rawLogs.indexOf(passwordUnFiltered), -1);
      assert.equal(rawLogs.indexOf(piiFiltered), -1);
      assert.notEqual(filteredLogs.indexOf(piiFiltered), -1);
      assert.equal(filteredLogs.indexOf(piiUnFiltered), -1);
      assert.equal(filteredLogs.indexOf(passwordUnFiltered), -1);
      successCallbackCalled();
      fs.unlinkSync(filteredLogFilePath);
    });
  });

  it('should move filtered logs to processed prefix', () => {
    handler(event, null, callback).then(() => {
      logsBucketProcessedParams.Body = Buffer.from(fs.readFileSync(filteredLogFilePath));
      assert(getObjectSpy.calledOnce);
      assert(putObjectSpy.calledAfter(getObjectSpy));
      assert(deleteObjectSpy.calledAfter(putObjectSpy));
      sinon.assert.calledWith(deleteObjectSpy, logsBucketParams);
      sinon.assert.calledWith(getObjectSpy, logsBucketParams);
      sinon.assert.calledWith(putObjectSpy, logsBucketProcessedParams);
      successCallbackCalled();
      fs.unlinkSync(filteredLogFilePath);
    });
  });

  it('should not put/delete object when getting object failed', () => {
    getObjectResponse = rejectPromise({ code: 'KeyNotFound', statusCode: 404 });
    expectedMessage = `ERROR:KeyNotFound:${logsObjectKey}`;
    handler(event, null, callback).then(() => {
      assert(getObjectSpy.calledOnce);
      assert(putObjectSpy.notCalled);
      assert(deleteObjectSpy.notCalled);
      errorCallbackCalled();
    });
  });

  describe('GetObject returns AccessDenied error for duplicate event', () => {

    it('should not throw error if object is already processed ', () => {
      getObjectResponse = rejectPromise({ code: 'AccessDenied', statusCode: 403 });
      expectedMessage = 'DuplicateEvent';
      handler(event, null, callback).then(() => {
        assert(getObjectSpy.calledOnce);
        assert(headObjectSpy.calledOnce);
        assert(putObjectSpy.notCalled);
        assert(deleteObjectSpy.notCalled);
        successCallbackCalled();
      });
    });

    it('should throw error if object is not already processed ', () => {
      getObjectResponse = rejectPromise({ code: 'AccessDenied', statusCode: 403 });
      headObjectResponse = rejectPromise({ code: 'KeyNotFound', statusCode: 404 });
      expectedMessage = `ERROR:KeyNotFound:AccessDenied:${filteredLogsObjectKey}`;
      handler(event, null, callback).then(() => {
        assert(getObjectSpy.calledOnce);
        assert(headObjectSpy.calledOnce);
        assert(putObjectSpy.notCalled);
        assert(deleteObjectSpy.notCalled);
        errorCallbackCalled();
      });
    });
  });

  it('should not delete object when putting object failed', () => {
    putSuccesCase = false;
    expectedMessage = `ERROR:PutFailed:${logsObjectKey}`;
    handler(event, null, callback).then(() => {
      assert(getObjectSpy.calledOnce);
      assert(putObjectSpy.calledOnce);
      assert(deleteObjectSpy.notCalled);
      errorCallbackCalled();
    });
  });
});
