# Google Cloud Report-URI Handler Function

> A function to recieve Report-URI reports and log them.

## Overview

This is a Google Cloud Function running on Node v10 that will read POSTed reports, and log them to Google Cloud Logging.

The function will receive Content Security Policy violation reports (`application/csp-report`) and Expect CT (`application/expect-ct-report+json`) reports, and reject any other reports. After applying basic validation, will write their contents to a Cloud Log.

## Getting Started

Since there are a few dependencies, it is necessary to deploy your Google Function from a Cloud Repository.

1. Clone this repo into a Cloud Repository
2. Create a Cloud Function using this repoisority as source.

Thats it!

## Calling the Funciton

You can simulate reports by HTTP POSTing a report to the functions endpoint.

1. POST to `https://<region>-<project-name>.cloudfunctions.net/<function-name>`
2. Include a report in the POST body, for example a Content Security Policy JSON object with a Content Type of `application/csp-report`.
3. You'll see a `204 No Content` response which indicates a success.
4. An `ALERT` log entry will be written into a Cloud Log named `report-uri`, with the function name, version written in the report entrys context.


## Specification

Compatible with the IETF [Expect-CT Extension for HTTP](https://tools.ietf.org/html/draft-ietf-httpbis-expect-ct-08) specification.
Broadily compatible with the W3C [Reporting API](https://w3c.github.io/reporting/).

## Why is this useful?

Expect-CT reports can only be sent to a different origin, hence the need to fun them in a different environment.  For example, if a certificate violation is present on `example.com` if would not be possible to report the error to a report-uri handler on that same origin, so another origin is requried, in this case `cloudfunctions.net` is different and thus can receive the report.

Log Alerts can be setup to trigger alerts when there are `x` many Expect-CT reports; which could indicate there is an attack or misconfiguration of certificates on your website properties.

Cloud Functions are billed per incovation, and whilst do not always start the quickest, they are great for report ingress since there is no need for fast responses, and it's basically free until a report is sent.

