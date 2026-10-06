# ByteGeist Cloud Study Tracker

ByteGeist Cloud Study Tracker is a simple serverless web application for tracking AWS services and cloud concepts while learning AWS.

## Current public mode

The portfolio-facing frontend is intentionally read-only. It loads topics from the API but does not expose create, edit, or delete controls.

Authenticated write access is the next backend hardening step. The intended design is public read access with authenticated/authorized mutation through Amazon Cognito or an equivalent API authorization layer.

## Architecture

The application uses:

- AWS Amplify for frontend hosting
- Amazon API Gateway for the HTTP API
- AWS Lambda for serverless backend logic
- Amazon DynamoDB for persistent data storage

## Architecture Flow

Browser → AWS Amplify → API Gateway → Lambda → DynamoDB

## Technologies

- HTML
- CSS
- JavaScript
- Node.js
- AWS Amplify
- Amazon API Gateway
- AWS Lambda
- Amazon DynamoDB

## Purpose

I built this project as part of the AWS Builder Center Weekend Deployment Challenge while learning AWS and serverless application development.

The original CRUD implementation proved create, read, update, and delete behavior. The public portfolio view is now read-only until authenticated write authorization is added to the deployed API.
