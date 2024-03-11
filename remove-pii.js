// all paths
const PII_PATTERN_FOR_PATHS = new RegExp('(/(setup/redirect|licenses)/)[^/?\\s]*', 'g' );

// all params including anything in signup[] form params
const PII_PATTERN_FOR_PARAMS = new RegExp('((password|password_confirmation|cc_no|ccv|authenticity_token|email|activation_code|code|token|first_name|last_name|address1|city|state|payerid|xv3v2ksky|credit_card|date|offer_code|auth_token|reset_password|reset_password_token|signup%255B\\w*\\%255D|signup%5B\\w*\\%5D|signup\\[\\w*\\])=)[^&\\s]*', 'g');

/**
 * Remove PII from given string
 * @param {string} logs
 * * logs body may contain any PII in query params or URL path,
 * * e.g, /licenses/secret123?email=abc@test.com&password=pass123!
 * @returns {string}
 * * returns filtered logs
 * * example return value /licenses/[FILTERED]?email=[FILTERED]&password=[FILTERED]
 */
function removePII(logs) {
  return removePIIFromPaths(removePIIFromParams(logs));
}

function removePIIFromParams(logs) {
  return logs.replace(PII_PATTERN_FOR_PARAMS, '$1[FILTERED]');
}

function removePIIFromPaths(logs) {
  return logs.replace(PII_PATTERN_FOR_PATHS, '$1[FILTERED]');
}

/*
 * removePII is a critical method
 * export it for unit testing
 */
exports.removePII = removePII;
