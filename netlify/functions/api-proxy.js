// Netlify serverless function to proxy requests to the HTTP API
// This avoids mixed content errors when calling HTTP APIs from HTTPS sites

const https = require('https');
const http = require('http');
const url = require('url');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      }
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    
    // Get API key from headers
    const authHeader = event.headers.authorization || '';
    
    // Target API endpoint (default to the Open WebUI endpoint)
    const targetEndpoint = process.env.TARGET_API_ENDPOINT || 'http://130.61.212.178:3000/api/chat/completions';
    
    // Parse the target URL
    const parsedUrl = url.parse(targetEndpoint);
    
    // Choose http or https module based on protocol
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    // Create options for the request
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
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
        reject(error);
      });
      
      // Write request body
      req.write(JSON.stringify(requestBody));
      req.end();
    });

    // Return the response from the API
    return {
      statusCode: response.statusCode,
      body: response.body,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Proxy error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message,
        details: 'Error occurred while proxying the request to the API'
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      }
    };
  }
};
