import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient.js";

export const handler = async (event) => {
    const respond = (statusCode, message) => ({
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: typeof message === "string" ? message : JSON.stringify(message)
    });

    try {
        const dueDay = parseInt(event.queryStringParameters?.dueDay);

        if (!dueDay || dueDay < 1 || dueDay > 28) {
            return respond(400, { message: "Invalid dueDay. Must be between 1 and 28." });
        }

        const PK = `LOAN#${dueDay}`;

        const command = new QueryCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
                ":pk": { S: PK }
            },
            ScanIndexForward: false
        });

        const result = await ddbClient.send(command);

        const loans = result.Items?.map(item => {
            const { loanId, customer, info } = unmarshall(item);

            return {
                customer: {
                    customerId: customer.customerId,
                    name: customer.name,
                    address: customer.address,
                    email: customer.email,
                    phone: customer.phone
                },
                loan: {
                    loanId,
                    dueDay: info.dueDay,
                    amount: info.amount,
                    interest: info.interest,
                    rate: info.rate,
                    notes: info.notes
                }
            };
        }) ?? [];

        return respond(200, loans);

    } catch (error) {
        console.error("GetLoan Error:", error);
        return respond(500, { message: "Failed to retrieve loans", error: error.message });
    }
};
