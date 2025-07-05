import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient.js";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

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

        const loans = await getLoansByDueDay(dueDay);
        return respond(200, loans);

    } catch (error) {
        console.error("GetLoan Error:", error);
        return respond(500, { message: "Failed to retrieve loans", error: error.message });
    }
};

async function getLoansByDueDay(dueDay) {
    const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
            ":pk": { S: "LOAN" }
        },
        ScanIndexForward: false
    });

    const result = await ddbClient.send(command);
    const items = result.Items?.map(unmarshall) ?? [];

    return items
        .filter(item => item?.dueDay === dueDay)
        .map(item => {
            const { loanId, dueDay, amount, rate, interest, notes, customer } = item;
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
                    dueDay,
                    amount,
                    rate,
                    interest,
                    notes
                }
            };
        });
}
