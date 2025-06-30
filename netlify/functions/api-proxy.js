// Netlify serverless function to proxy requests to the HTTP API
// This avoids mixed content errors when calling HTTP APIs from HTTPS sites

const https = require('https');
const http = require('http');
const url = require('url');

exports.handler = async function(event, context) {
  // Set up CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      })
    };
  }

  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON',
          message: 'Failed to parse request body as JSON',
          details: parseError.message
        })
      };
    }
    
    // Get API key from headers
    const authHeader = event.headers.authorization || '';
    
    // Target API endpoint (default to the Open WebUI endpoint)
    const targetEndpoint = process.env.TARGET_API_ENDPOINT || 'http://130.61.212.178:3000/api/chat/completions';
    
    console.log(`Proxying request to: ${targetEndpoint}`);
    
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
      },
      // Don't verify SSL certificates for development
      rejectUnauthorized: false
    };
    
    console.log(`Request options: ${JSON.stringify({
      hostname: options.hostname,
      port: options.port,
      path: options.path,
      method: options.method
    })}`);

    // Make the request to the target API
    const response = await new Promise((resolve, reject) => {
      const req = httpModule.request(options, (res) => {
        let data = '';
        
        // A chunk of data has been received
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        // The whole response has been received
        res.on('end', () => {
          console.log(`Response status code: ${res.statusCode}`);
          
          // Check if the response is successful
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              // Try to parse JSON to validate it, but return the original data
              JSON.parse(data);
              resolve({
                statusCode: res.statusCode,
                body: data,
                headers: headers
              });
            } catch (e) {
              console.error('Error parsing response JSON:', e);
              resolve({
                statusCode: 502,
                headers: headers,
                body: JSON.stringify({
                  error: 'Invalid response from target API',
                  message: 'The target API returned invalid JSON',
                  details: e.message,
                  rawResponse: data.substring(0, 500) // First 500 chars for debugging
                })
              });
            }
          } else {
            // Non-success status code
            console.error(`Target API returned error status: ${res.statusCode}`);
            resolve({
              statusCode: res.statusCode,
              headers: headers,
              body: JSON.stringify({
                error: `Target API error: ${res.statusCode}`,
                message: `The target API returned an error status code: ${res.statusCode}`,
                details: data
              })
            });
          }
        });
      });

      // Handle request errors
      req.on('error', (error) => {
        console.error('Request error:', error);
        resolve({
          statusCode: 502,
          headers: headers,
          body: JSON.stringify({
            error: 'Connection error',
            message: `Failed to connect to the target API: ${error.message}`,
            details: error.stack
          })
        });
      });

      // Write data to request body
      req.write(JSON.stringify(requestBody));
      req.end();
    });

    return response;
  } catch (error) {
    console.error('Error in proxy function:', error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        details: error.stack
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      }
    };
  }
};
