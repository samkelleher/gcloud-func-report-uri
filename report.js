const Logging = require('@google-cloud/logging');

const logging = Logging();

function hasbody (req) {
    return req.headers['transfer-encoding'] !== undefined ||
      !isNaN(req.headers['content-length']);
}

function logPayload(req, res) {
    const logName = 'report-uri';
    const log = logging.log(logName);

    const metadata = {
        // https://cloud.google.com/logging/docs/api/ref_v2beta1/rest/v2beta1/MonitoredResource
        resource: {
          type: 'cloud_function',
          labels: {
            function_name: process.env.FUNCTION_NAME,
          },
        },
      };
    
      // https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorEvent
      const errorEvent = {
        message: 'A report has been submitted.',
        serviceContext: {
          service: `cloud_function:${process.env.FUNCTION_NAME}`,
          version: require('./package.json').version || 'unknown',
        },
      };
    
      // Write the error log entry
      return new Promise((resolve, reject) => {
        log.write(log.entry(metadata, errorEvent), () => {
            resolve();
        }));
      });
}

exports.report = function(req, res) {
    if (req.app.enabled("x-powered-by")) req.app.disable("x-powered-by");
    if (req.method !== "POST") {
        res.sendStatus(405);
        return;
    }
    if (!req.is('application/csp-report') && !req.is('application/expect-ct-report+json') && !req.is('application/json')) {
        res.sendStatus(400);
        return;
    }
    if (!hasbody(req)) {
        res.sendStatus(400);
        return;
    }
    logPayload(req, res)
        .then(() => {
            res.sendStatus(204);
        })
        .catch(() => {
            res.sendStatus(500);
        });
    
}