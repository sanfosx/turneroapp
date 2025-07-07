export default async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { function: functionName, parameters, url } = req.body;

    // Hacer la solicitud a Google Apps Script
    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        function: functionName,
        parameters: parameters
      })
    });

    if (!googleResponse.ok) {
      throw new Error(`Google Apps Script error: ${googleResponse.status}`);
    }

    const data = await googleResponse.json();
    res.status(200).json({ result: data });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
