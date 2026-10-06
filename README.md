# ByteGeist Cloud Study Tracker

ByteGeist Cloud Study Tracker is a multi-user serverless application for tracking AWS services and cloud concepts.

## Authentication and authorization

The public portfolio view exposes seeded demo topics through an anonymous read-only endpoint.

Users can create an account and sign in through Amazon Cognito. Authenticated users can create, edit, and delete their own private study topics.

Security is enforced at multiple layers:

- Amazon Cognito User Pool handles account creation, email verification, sign-in, password reset, and OAuth authorization-code login with PKCE.
- Amazon API Gateway uses a JWT authorizer on private reads and all mutation routes.
- AWS Lambda reads the Cognito sub claim from the verified JWT.
- Every private DynamoDB record stores its owner ID.
- Lambda checks ownership before update or delete operations.
- Anonymous users cannot call private CRUD endpoints.

## Architecture

Browser -> AWS Amplify -> Amazon Cognito / API Gateway -> Lambda -> DynamoDB

## Routes

- GET /topics - public demo topics
- GET /my-topics - authenticated user's private topics
- POST /topics - create private topic
- PUT /topics/{id} - update owned topic
- DELETE /topics/{id} - delete owned topic

## Purpose

The project began as an AWS Builder Center weekend challenge. It was later hardened after identifying that anonymous CRUD on a public portfolio application violated least-privilege principles. The current version uses Cognito authentication, API Gateway JWT authorization, and per-record ownership enforcement.
