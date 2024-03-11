function parseHeaders(arr, keys) {
  const result = {};
  for (let i = 0; i < arr.length; i += 1) {
    const index = keys.indexOf(arr[i].name.toLowerCase());
    if (index !== -1) {
      const key = keys[index].replace('-', '_').toLowerCase();
      result[key] = arr[i].value;
    }
  }
  return result;
}

/*
 * Export method for unit testing
 */
exports.parseHeaders = parseHeaders;

exports.handler = (event, context, callback) => {
  if (!event.deliveryStreamArn) {
    callback('Not Kinesis delivery stream event', 'ERROR');
    return false;
  }
  const output = event.records.map((record) => {
    const entry = JSON.parse(Buffer.from(record.data, 'base64').toString('utf8'));
    const headers = parseHeaders(entry.httpRequest.headers, ['host', 'user-agent']);
    const result = JSON.stringify({
      timestamp: entry.timestamp,
      terminatingRuleId: entry.terminatingRuleId,
      terminatingRuleType: entry.terminatingRuleType,
      action: entry.action,
      httpSourceId: entry.httpSourceId,
      clientIp: entry.httpRequest.clientIp,
      country: entry.httpRequest.country,
      host: headers.host,
      user_agent: headers.user_agent,
      uri: removePIIFromPaths(entry.httpRequest.uri),
      args: removePIIFromParams(entry.httpRequest.args),
      httpVersion: entry.httpRequest.httpVersion,
      httpMethod: entry.httpRequest.httpMethod,
      requestId: entry.httpRequest.requestId,
    }) + "\n";
    return {
      recordId: record.recordId,
      result: 'Ok',
      data: Buffer.from(result, 'utf8').toString('base64'),
    };
  });
  callback(null, { records: output });
  return true;
};
