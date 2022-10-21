import { DynamoDB } from "aws-sdk";
import fetch from 'node-fetch';

const dynamoDb = new DynamoDB.DocumentClient();

export async function handler(event) {

  const getClient = async function (vendorToken, tenantId) {
    let token = "Bearer " + vendorToken;
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: token
        }
      };

      let url = `https://api.frontegg.com/tenants/resources/tenants/v1/${tenantId}`;

      fetch(url, options)
        .then(res => res.json())
        .then(data => resolve(data[0].name));
    })
  }

  const getUserTenantId = async function (userToken) {
    return new Promise(async (resolve, reject) => {
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: userToken
        }
      };

      fetch('https://app-jpmoqncd0tqr.frontegg.com/identity/resources/users/v2/me', options)
        .then(res => res.json())
        .then(data => {
          resolve(data.tenantId);
        });
    })
  }

  const getVendorToken = async function () {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {accept: 'application/json', 'content-type': 'application/json'},
        body: JSON.stringify({
          clientId: '<client-id>',
          secret: '<seecret>'
        })
      };
      
      fetch('https://api.frontegg.com/auth/vendor/', options)
        .then(response => response.json())
        .then(response => resolve(response.token))
        .catch(err => {throw err});
    });
  }

  try {
    let userToken = event.headers ? event.headers.authorization : null;
    let vendorToken = await getVendorToken();
    let tenantId = await getUserTenantId(userToken);
    let clientId = await getClient(vendorToken, tenantId);
    console.log("clientId " + clientId);

    const getParams = {
      // Get the table name from the environment variable
      TableName: process.env.tableName,
      // Get the row where the counter is called "clicks"
      Key: {
        counter: "clicks",
      },
    };
    const results = await dynamoDb.get(getParams).promise();

    // If there is a row, then get the value of the
    // column called "tally"
    let count = results.Item ? results.Item.tally : 0;

    const putParams = {
      TableName: process.env.tableName,
      Key: {
        counter: "clicks",
      },
      // Update the "tally" column
      UpdateExpression: "SET tally = :count",
      ExpressionAttributeValues: {
        // Increase the count
        ":count": ++count,
      },
    };
    await dynamoDb.update(putParams).promise();

    return {
      statusCode: 200,
      body: count,
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 400,
      body: JSON.stringify(err),
    };
  }


}