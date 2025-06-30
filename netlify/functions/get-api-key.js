// Netlify serverless function to securely provide the API key
exports.handler = async function(event, context) {
  // Add CORS headers to allow requests from your domain
  const headers = {
    "Access-Control-Allow-Origin": "https://rkts-collection-explorer.netlify.app/", // Replace with your specific domain in production
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET"
  };
  
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  
  try {
    // Return the API key from environment variable
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        apiKey: process.env.REACT_APP_OPENWEBUI_API_KEY || ""
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to get API key" })
    };
  }
}
