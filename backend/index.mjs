import {
  DynamoDBClient,
  ScanCommand,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand
} from "@aws-sdk/client-dynamodb";

import { randomUUID } from "node:crypto";

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function convertItem(item = {}) {
  return {
    id: item.id?.S || "",
    topic: item.topic?.S || "",
    status: item.status?.S || "",
    notes: item.notes?.S || "",
    owner: item.owner?.S || "",
    visibility: item.visibility?.S || "private"
  };
}

function ownerFromEvent(event) {
  return event.requestContext?.authorizer?.jwt?.claims?.sub || "";
}

export const handler = async (event) => {
  console.log("Received route:", event.routeKey);

  const method = event.requestContext?.http?.method || event.httpMethod;
  const routeKey = event.routeKey || "";
  const id = event.pathParameters?.id;
  const owner = ownerFromEvent(event);

  try {
    if (method === "GET" && routeKey === "GET /topics") {
      const result = await client.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "#visibility = :public",
        ExpressionAttributeNames: { "#visibility": "visibility" },
        ExpressionAttributeValues: { ":public": { S: "public" } }
      }));

      const topics = (result.Items || [])
        .map(convertItem)
        .sort((a, b) => a.topic.localeCompare(b.topic));

      return createResponse(200, topics);
    }

    if (method === "GET" && routeKey === "GET /my-topics") {
      if (!owner) {
        return createResponse(401, { message: "Authentication required." });
      }

      const result = await client.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "#owner = :owner",
        ExpressionAttributeNames: { "#owner": "owner" },
        ExpressionAttributeValues: { ":owner": { S: owner } }
      }));

      const topics = (result.Items || [])
        .map(convertItem)
        .sort((a, b) => a.topic.localeCompare(b.topic));

      return createResponse(200, topics);
    }

    if (method === "POST") {
      if (!owner) {
        return createResponse(401, { message: "Authentication required." });
      }

      const body = JSON.parse(event.body || "{}");
      if (!body.topic?.trim()) {
        return createResponse(400, { message: "Topic is required." });
      }

      const requestedVisibility = body.visibility === "private" ? "private" : "public";

      const newTopic = {
        id: randomUUID(),
        topic: body.topic.trim(),
        status: body.status || "Not Started",
        notes: body.notes?.trim() || "",
        owner,
        visibility: requestedVisibility
      };

      await client.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          id: { S: newTopic.id },
          topic: { S: newTopic.topic },
          status: { S: newTopic.status },
          notes: { S: newTopic.notes },
          owner: { S: newTopic.owner },
          visibility: { S: newTopic.visibility }
        }
      }));

      return createResponse(201, newTopic);
    }

    if (method === "PUT") {
      if (!owner) {
        return createResponse(401, { message: "Authentication required." });
      }
      if (!id) {
        return createResponse(400, { message: "Topic ID is required." });
      }

      const existing = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: id } }
      }));

      if (!existing.Item) {
        return createResponse(404, { message: "Topic not found." });
      }
      if (existing.Item.owner?.S !== owner) {
        return createResponse(403, { message: "You can only edit your own topics." });
      }

      const body = JSON.parse(event.body || "{}");
      if (!body.topic?.trim()) {
        return createResponse(400, { message: "Topic is required." });
      }

      const requestedVisibility = body.visibility === "private" ? "private" : "public";

      const result = await client.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: id } },
        UpdateExpression: "SET topic = :topic, #status = :status, notes = :notes, #visibility = :visibility",
        ExpressionAttributeNames: {
          "#status": "status",
          "#visibility": "visibility"
        },
        ExpressionAttributeValues: {
          ":topic": { S: body.topic.trim() },
          ":status": { S: body.status || "Not Started" },
          ":notes": { S: body.notes?.trim() || "" },
          ":visibility": { S: requestedVisibility }
        },
        ReturnValues: "ALL_NEW"
      }));

      return createResponse(200, convertItem(result.Attributes));
    }

    if (method === "DELETE") {
      if (!owner) {
        return createResponse(401, { message: "Authentication required." });
      }
      if (!id) {
        return createResponse(400, { message: "Topic ID is required." });
      }

      const existing = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: id } }
      }));

      if (!existing.Item) {
        return createResponse(404, { message: "Topic not found." });
      }
      if (existing.Item.owner?.S !== owner) {
        return createResponse(403, { message: "You can only delete your own topics." });
      }

      await client.send(new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: id } }
      }));

      return createResponse(200, { message: "Topic deleted." });
    }

    return createResponse(405, { message: "Method not allowed." });
  } catch (error) {
    console.error(error);
    return createResponse(500, {
      message: "Internal server error.",
      error: error.message
    });
  }
};
