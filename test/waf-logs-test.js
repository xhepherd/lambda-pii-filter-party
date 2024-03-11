/* eslint-disable import/no-unresolved, import/no-extraneous-dependencies */
const fs = require('fs');
const sinon = require('sinon');
const assert = require('assert');
/* eslint-enable import/no-unresolved, import/no-extraneous-dependencies */

describe('Transform WAF Logs', () => {
  let event;
  const wafLogs = require('./../waf-logs.min.js');
  const handler = wafLogs.handler;
  const parseHeaders = wafLogs.parseHeaders;
  const eventFile = fs.readFileSync('./test/files/waf-unfiltered-log-records.js');
  const output = JSON.parse(fs.readFileSync('./test/files/waf-transformed-filtered-log-records.js'));
  const headers = [
    {"name": "include1", "value": "value1"},
    {"name": "include2", "value": "value2"},
    {"name": "exclude1", "value": "value3"},
    {"name": "exclude2", "value": "value4"}
  ];
  const expectedHeaders = { include1: "value1", include2: "value2" };

  beforeEach(() => {
    event = JSON.parse(eventFile);
  });

  it('should transform and filter records', () => {
    let callback = sinon.fake();
    handler(event, null, callback);
    assert(callback.calledWith(null, output));
  });

  it('should parse headers successfully', () => {
    assert.deepEqual(parseHeaders(headers, ['include1', 'include2']), expectedHeaders);
    assert.notDeepEqual(parseHeaders(headers, ['include1', 'exclude2']), expectedHeaders);
  });
});
