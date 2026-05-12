import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { token } = await req.json();

        if (!token) {
            return Response.json(
                { error: 'Token required' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Use service role to query (public function, no user auth needed)
        const base44 = createClientFromRequest(req);
        
        const clients = await base44.asServiceRole.entities.Client.list();
        const client = clients.find(c => c.project_qr_token === token);

        if (!client) {
            return Response.json(
                { error: 'Invalid project token' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Return only necessary client info
        return Response.json(
            {
                client: {
                    id: client.id,
                    name: client.name,
                    tenant_id: client.tenant_id
                }
            },
            { headers: corsHeaders }
        );

    } catch (error) {
        console.error('Error validating project token:', error);
        return Response.json(
            { error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
});