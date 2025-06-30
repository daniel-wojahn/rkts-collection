// Netlify serverless function to proxy requests to the HTTP API
// This avoids mixed content errors when calling HTTP APIs from HTTPS sites

const https = require('https');
const http = require('http');
const url = require('url');

// For debugging
const DEBUG = true;

// Allow self-signed certificates for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

exports.handler = async function(event, context) {
  // Set up CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No content needed for OPTIONS
      headers,
      body: ''
    };
  }

  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse the request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid JSON in request body'
        })
      };
    }

    // Get authorization header from the incoming request
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    // Target API endpoint (default to the Open WebUI endpoint)
    const targetEndpoint = process.env.TARGET_API_ENDPOINT || 'http://130.61.212.178:3000/api/chat/completions';
    
    console.log(`Proxying request to: ${targetEndpoint}`);
    console.log(`Request body: ${JSON.stringify(requestBody).substring(0, 200)}...`);
    console.log(`Auth header present: ${authHeader ? 'Yes' : 'No'}`);
    
    // Parse the target URL
    const parsedUrl = url.parse(targetEndpoint);
    
    // Determine if we need http or https
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    // Create request options
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      },
      // For development, allow self-signed certificates
      rejectUnauthorized: false
    };
    
    // Make the request to the target API
    const response = await new Promise((resolve, reject) => {
      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });
      
      req.on('error', (error) => {
        console.error('Error making request to target API:', error);
        reject(error);
      });
      
      // Write the request body
      req.write(JSON.stringify(requestBody));
      req.end();
    });
    
    // Return the response from the target API
    return {
      statusCode: response.statusCode,
      headers: {
        ...headers,
        'Content-Type': response.headers['content-type'] || 'application/json'
      },
      body: response.body
    };
  } catch (error) {
    console.error('Error in proxy function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        details: error.stack
      })
    };
  }
};
