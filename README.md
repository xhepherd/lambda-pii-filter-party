# Lambda PII Filter Party
AWS Lambda Functions to redact PII from CloudFront and WAF Logs

This repository contains AWS Lambda functions that process CloudFront logs from S3 and WAF log from Kinesis Stream events, filters them for Personally Identifiable Information (PII), and stores the filtered logs in a structured format that can be processed faster by Athena through partitioning.

## Filter CloudFront Logs 
`cf-logs.min.js` is used for filtering PII from CloudFront access logs.

- The Lambda function can be triggered by an event, such as a new log file being uploaded to the S3 bucket.
- It retrieves the log file from the specified S3 bucket location, using the format `cf-logs-unfiltered/E26VN48UO6YOQH.2019-01-25-12.51a1005c.gz`.
- The function applies a filtering mechanism to redact any PII from the log file.
- The filtered log file is then stored in a new location within the same S3 bucket, using the structured naming convention `cf-logs-filtered/year=2019/month=01/day=25/hour=12/distribution=E26VN48UO6YOQH/51a1005c.gz`.
- The function utilizes two environment variables:
  - `FILTERED_LOGS_PREFIX`: Specifies the prefix location in the S3 bucket where the filtered logs should be stored.
  - `UNFILTERED_LOGS_PREFIX`: Specifies the prefix location in the S3 bucket where the unfiltered log files are stored.

## Filter WAF Logs
`waf-logs.min.js` is used for filtering PII from WAF logs

- The Lambda function is triggered by an Kinesis Stream event 
- Function receives the WAF access log record object with all `httpRequest` attributes
- Function replaces the PII values with `[FILTERED]` and returns the object

## Update PII Keywords
PII keywords are maintained in `remove-pii.js` file
- `PII_PATTERN_FOR_PATHS` conatins URL paths which may have PII in query paramaters.
- `PII_PATTERN_FOR_PARAMS` contains keywords to filter from HTTP Request POST body parameters.

### Run Gulp to update function files
To run the Gulpfile and merge/minimize your function files, follow these steps:

1. Open the project directory in your terminal.
2. Run the Gulp command:

   ```bash
   gulp
   ```
   This will execute the default Gulp task specified in gulpfile.js
3. Gulp will process your function files, merge them with remove-pii.js into a single function file, and minimize the resulting code into function.min.js file.


## Deployment

1. Create a .zip file that contains the content of node_modules and function file merged with `remove-pii.js` as index.js.
1. Use this .zip deployment package to deploy the function code to Lambda.
Set up Lambda function triggers as needed.  


## Configure Environment Variables for CloudFront Function
Set the following environment variables for the Lambda function with their respective values:
1. `FILTERED_LOGS_PREFIX`: The prefix location in the S3 bucket where the filtered logs should be stored.
1. `UNFILTERED_LOGS_PREFIX`: The prefix location in the S3 bucket where the unfiltered log files are stored.

## Unit Testing

This project includes unit tests located in the test folder.
To run the tests, use the following command:
   ```bash
   npm install
   npm run lint && npm run test-ci
   ```

## License
This project is licensed under the MIT License. See the LICENSE file for more information.