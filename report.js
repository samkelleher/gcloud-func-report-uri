const GCloud = require("@google-cloud/logging");
const BodyParser = require("body-parser");

const logging = new GCloud.Logging();
const logName = "report-uri";
const log = logging.log(logName);

const jsonParser = BodyParser.json({
  type: ["application/csp-report", "application/expect-ct-report+json"]
});

async function processBody(req, res) {
  return new Promise((resolve, reject) => {
    jsonParser(req, res, error => {
      // If the body type matches, req.body will be populated.
      if (error) {
        reject(error);
      } else {
        resolve(req);
      }
    });
  });
}

function hasbody(req) {
  return (
    req.headers["transfer-encoding"] !== undefined ||
    !isNaN(req.headers["content-length"])
  );
}

function logPayload(req, res) {
  const report = req.body;

  let reportType = "unknown";

  if (!report) {
    reportType = "not-parsed";
  } else if (report["csp-report"]) {
    reportType = "CSP";
  } else if (report["expect-ct-report"]) {
    reportType = "Expect-CT";
  } else {
    reportType = `unknown type of '${typeof report}'`;
  }

  const metadata = {
    // https://cloud.google.com/logging/docs/api/ref_v2beta1/rest/v2beta1/MonitoredResource
    resource: {
      type: "cloud_function",
      labels: {
        function_name: process.env.K_SERVICE
      }
    },
    severity: "ALERT"
  };

  const message = `A ${reportType} report has been submitted.`;
  // https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorEvent
  const errorEvent = {
    message,
    reportType,
    report,
    serviceContext: {
      service: `cloud_function:${process.env.K_SERVICE}`,
      version: `${process.env.K_REVISION}`
    }
  };

  const entry = log.entry(metadata, errorEvent);

  // Write the error log entry
  return new Promise((resolve, reject) => {
    log
      .write(entry)
      .then(() => {
        const outputAsJson = entry.toJSON();
        resolve(JSON.stringify(outputAsJson, null, 2));
      })
      .catch(reject);
  });
}

exports.report = async function(req, res) {
  if (req.app.enabled("x-powered-by")) req.app.disable("x-powered-by");
  if (req.method !== "POST") {
    res.sendStatus(405);
    return;
  }
  if (
    !req.is("application/csp-report") &&
    !req.is("application/expect-ct-report+json") &&
    !req.is("application/json")
  ) {
    res.sendStatus(400);
    return;
  }
  if (!hasbody(req)) {
    res.sendStatus(400);
    return;
  }

  if (req.is("application/json")) {
    // The body will have already been parsed.
    // Should we ignore random JSON being posted?
    logPayload(req, res)
      .then(entry => {
        res.status(200).json(entry);
      })
      .catch(error => {
        console.error(error);
        res.sendStatus(500);
      });
  } else {
    // We need to process the body before trying to log.
    req._body = false; // Reset so body will be reparsed.
    processBody(req, res)
      .then(reqWithBody => {
        logPayload(req, res)
          .then(entry => {
            res.status(200).json(entry);
          })
          .catch(error => {
            console.error(error);
            res.sendStatus(500);
          });
      })
      .catch(error => {
        // the body was malformed in some way
        console.error(error);
        res.sendStatus(400);
      });
  }
};
