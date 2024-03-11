const assert = require('assert');

describe('Filter PII from logs', () => {
  const removePII = require('./../remove-pii.js').removePII;
  it('should remove all PII params from URL query', () => {
    const params = [
      'email', 'password', 'payerid', 'code', 'activation_code', 'offer_code',
      'reset_password', 'reset_password_token', 'token', 'auth_token',
      'signup[first_name]', 'signup[last_name]', 'signup[address1]',
      // URL encoded [ and ] characters
      'signup%5Bcity%5D', 'signup%5Bstate%5D', 'signup%5Bccv%5D', 'signup%5Bcc_no%5D',
    ];
    const unfilteredParams = params.join('=value123#-_1&') + '=1234';
    const filteredParams = params.join('=[FILTERED]&') + '=[FILTERED]';
    assert.equal(removePII(unfilteredParams), filteredParams);
  });

  it('should not remove non PII params from URL query', () => {
    const params = [
      'a_aid', 'a_fid',
      'data1', 'data2', 'data3', 'data4',
      'offer=3monthsfree',
    ].join('=abc&');
    assert.equal(removePII(params), params);
  });

  it('should remove all PII from licenses path', () => {
    const unfilteredURL = '/licenses/secret123?email=a@b.com&password=pass123&other=value';
    const filteredURL = '/licenses/[FILTERED]?email=[FILTERED]&password=[FILTERED]&other=value';
    assert.equal(removePII(unfilteredURL), filteredURL);
  });

  it('should remove all PII from setup path', () => {
    const unfilteredURL = '/setup/redirect/secret123?email=a@b.com&password=pass123&other=value';
    const filteredURL = '/setup/redirect/[FILTERED]?email=[FILTERED]&password=[FILTERED]&other=value';
    assert.equal(removePII(unfilteredURL), filteredURL);
  });
});
