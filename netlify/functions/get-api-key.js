// Netlify serverless function to securely provide the API key
exports.handler = async function(event, context) {
  // Add CORS headers to allow requests from your domain
  const headers = {
    "Access-Control-Allow-Origin": "*", // In production, restrict this to your specific domain
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204, // No content needed for OPTIONS
      headers,
      body: ""
    };
  }
  
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  
  try {
    // Get API key from environment variable
    const apiKey = process.env.OPENWEBUI_API_KEY || process.env.REACT_APP_OPENWEBUI_API_KEY || "";
    
    if (!apiKey) {
      console.warn("API key not found in environment variables");
    }
    
    // Return the API key
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        apiKey: apiKey,
        success: !!apiKey
      })
    };
  } catch (error) {
    console.error("Error in get-api-key function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to get API key",
        message: error.message 
      })
    };
  }
}
