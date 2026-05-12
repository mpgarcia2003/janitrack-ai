import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    // Get token from URL
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(renderHTML('Invalid QR Code', 'No token provided'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Use service role to fetch data (no auth required)
    const base44 = createClientFromRequest(req);
    
    const areas = await base44.asServiceRole.entities.Area.list();
    const area = areas.find(a => a.qr_token === token);

    if (!area) {
      return new Response(renderHTML('Area Not Found', 'Invalid QR code'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const clients = await base44.asServiceRole.entities.Client.list();
    const client = clients.find(c => c.id === area.client_id);

    // Handle form submission
    if (req.method === 'POST') {
      const formData = await req.formData();
      const cleanerName = formData.get('cleanerName');
      const notes = formData.get('notes');

      await base44.asServiceRole.entities.CleaningEvent.create({
        tenant_id: area.tenant_id,
        client_id: area.client_id,
        area_id: area.id,
        cleaner_name: cleanerName,
        notes: notes,
        server_timestamp: new Date().toISOString(),
        device_timestamp: new Date().toISOString(),
        timezone: 'America/New_York',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent'),
        status: 'completed'
      });

      await base44.asServiceRole.entities.Area.update(area.id, {
        last_cleaned_at: new Date().toISOString()
      });

      return new Response(renderSuccessHTML(area.name, client?.name), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Render form
    return new Response(renderFormHTML(area, client, token), {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(renderHTML('Error', error.message), {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

function renderHTML(title, message) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - JaniTrack</title>
  <style>
    body { font-family: system-ui; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; width: 100%; }
    h1 { color: #1a202c; margin: 0 0 1rem 0; }
    p { color: #4a5568; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function renderFormHTML(area, client, token) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Check In - ${area.name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; }
    .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; }
    h1 { margin: 0 0 0.5rem 0; font-size: 1.75rem; }
    .subtitle { opacity: 0.9; font-size: 0.875rem; }
    label { display: block; font-weight: 600; color: #2d3748; margin-bottom: 0.5rem; }
    input, textarea { width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem; margin-bottom: 1.5rem; }
    input:focus, textarea:focus { outline: none; border-color: #667eea; }
    button { width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem; border: none; border-radius: 0.5rem; font-size: 1.125rem; font-weight: 600; cursor: pointer; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>📍 ${area.name}</h1>
        <p class="subtitle">${client ? client.name : ''}</p>
      </div>
      
      <form method="POST">
        <label>Your Name *</label>
        <input type="text" name="cleanerName" required placeholder="Enter your name">
        
        <label>Notes (Optional)</label>
        <textarea name="notes" rows="4" placeholder="Any issues or observations..."></textarea>
        
        <button type="submit">✅ Complete Check-In</button>
      </form>
    </div>
  </div>
</body>
</html>`;
}

function renderSuccessHTML(areaName, clientName) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success!</title>
  <style>
    body { font-family: system-ui; margin: 0; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; width: 100%; text-align: center; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #065f46; margin: 0 0 1rem 0; }
    p { color: #4a5568; font-size: 1.125rem; }
    button { margin-top: 2rem; background: #10b981; color: white; padding: 0.75rem 2rem; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Check-In Complete!</h1>
    <p>Thank you for cleaning<br><strong>${areaName}</strong></p>
    ${clientName ? `<p style="color: #6b7280; font-size: 0.875rem;">at ${clientName}</p>` : ''}
    <button onclick="window.location.reload()">Scan Another Area</button>
  </div>
</body>
</html>`;
}