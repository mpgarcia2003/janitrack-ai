import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    try {
        console.log('========================================');
        console.log('validateQRToken - Function Called!');
        console.log('========================================');
        
        // Initialize Base44 with explicit app_id
        const appId = Deno.env.get('BASE44_APP_ID');
        console.log('App ID:', appId ? 'Set' : 'NOT SET');
        
        const base44 = createClient({
            appId: appId,
            requiresAuth: false
        });

        const body = await req.json();
        console.log('Request body:', JSON.stringify(body));
        
        const { token, tokenType } = body;
        console.log('Extracted token:', token);
        console.log('Extracted tokenType:', tokenType);
        
        if (tokenType === 'area') {
            console.log('Looking for AREA token...');
            
            // Find area by qr_token
            const areas = await base44.entities.Area.list();
            console.log('Total areas found:', areas.length);
            
            if (areas.length > 0) {
                console.log('First 3 area tokens:');
                areas.slice(0, 3).forEach((a, i) => {
                    console.log(`  ${i+1}. ${a.qr_token} (${a.name})`);
                });
            } else {
                console.log('No areas found in the database.');
            }
            
            console.log('Searching for exact match:', token);
            const area = areas.find(a => {
                const match = a.qr_token === token;
                if (match) {
                    console.log('MATCH FOUND (area):', a.name);
                }
                return match;
            });
            
            if (!area) {
                console.log('❌ NO MATCH FOUND for AREA token.');
                console.log('Token we are looking for:', token);
                console.log('Token type:', typeof token);
                console.log('Token length:', token?.length);
                return new Response(JSON.stringify({ 
                    error: 'Invalid QR code',
                    debug: {
                        searchedFor: token,
                        tokenType: typeof token,
                        tokenLength: token?.length,
                        totalEntitiesChecked: areas.length,
                        sampleEntities: areas.slice(0, 3).map(a => ({ id: a.id, qr_token: a.qr_token, name: a.name }))
                    }
                }), { 
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            }

            console.log('✅ Area found:', area.name);

            // Get client info
            const clients = await base44.entities.Client.list();
            console.log('Total clients found for area client_id lookup:', clients.length);
            const client = clients.find(c => c.id === area.client_id);
            console.log('Client for area:', client ? client.name : 'NOT FOUND');

            return new Response(JSON.stringify({
                area: {
                    id: area.id,
                    name: area.name,
                    location_desc: area.location_desc,
                    client_id: area.client_id,
                    tenant_id: area.tenant_id
                },
                client: client ? {
                    id: client.id,
                    name: client.name,
                    code: client.code
                } : null
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        if (tokenType === 'project') {
            console.log('Looking for PROJECT token...');
            const clients = await base44.entities.Client.list();
            console.log('Total clients found:', clients.length);
            
            if (clients.length > 0) {
                console.log('First 3 client project_qr_tokens:');
                clients.slice(0, 3).forEach((c, i) => {
                    console.log(`  ${i+1}. ${c.project_qr_token} (${c.name})`);
                });
            } else {
                console.log('No clients found in the database.');
            }

            console.log('Searching for exact match:', token);
            const client = clients.find(c => {
                const match = c.project_qr_token === token;
                if (match) {
                    console.log('MATCH FOUND (project):', c.name);
                }
                return match;
            });
            
            if (!client) {
                console.log('❌ NO MATCH FOUND for PROJECT token.');
                return new Response(JSON.stringify({ 
                    error: 'Invalid QR code',
                    debug: {
                        searchedFor: token,
                        totalEntitiesChecked: clients.length,
                        sampleEntities: clients.slice(0, 3).map(c => ({ id: c.id, project_qr_token: c.project_qr_token, name: c.name }))
                    }
                }), { 
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            }
            console.log('✅ Client found for project:', client.name);

            return new Response(JSON.stringify({
                client: {
                    id: client.id,
                    name: client.name,
                    code: client.code,
                    tenant_id: client.tenant_id
                }
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        if (tokenType === 'facility-feedback') {
            console.log('Looking for FACILITY-FEEDBACK token...');
            const clients = await base44.entities.Client.list();
            console.log('Total clients found:', clients.length);

            if (clients.length > 0) {
                console.log('First 3 client feedback_qr_tokens:');
                clients.slice(0, 3).forEach((c, i) => {
                    console.log(`  ${i+1}. ${c.feedback_qr_token} (${c.name})`);
                });
            } else {
                console.log('No clients found in the database.');
            }

            console.log('Searching for exact match:', token);
            const client = clients.find(c => {
                const match = c.feedback_qr_token === token;
                if (match) {
                    console.log('MATCH FOUND (facility-feedback):', c.name);
                }
                return match;
            });
            
            if (!client) {
                console.log('❌ NO MATCH FOUND for FACILITY-FEEDBACK token.');
                return new Response(JSON.stringify({ 
                    error: 'Invalid QR code',
                    debug: {
                        searchedFor: token,
                        totalEntitiesChecked: clients.length,
                        sampleEntities: clients.slice(0, 3).map(c => ({ id: c.id, feedback_qr_token: c.feedback_qr_token, name: c.name }))
                    }
                }), { 
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            }
            console.log('✅ Client found for facility-feedback:', client.name);

            return new Response(JSON.stringify({
                client: {
                    id: client.id,
                    name: client.name,
                    code: client.code,
                    tenant_id: client.tenant_id
                }
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        if (tokenType === 'inventory') {
            console.log('Looking for INVENTORY token...');
            const clients = await base44.entities.Client.list();
            console.log('Total clients found:', clients.length);
            
            if (clients.length > 0) {
                console.log('First 3 client inventory_qr_tokens:');
                clients.slice(0, 3).forEach((c, i) => {
                    console.log(`  ${i+1}. ${c.inventory_qr_token} (${c.name})`);
                });
            } else {
                console.log('No clients found in the database.');
            }

            console.log('Searching for exact match:', token);
            const client = clients.find(c => {
                const match = c.inventory_qr_token === token;
                if (match) {
                    console.log('MATCH FOUND (inventory):', c.name);
                }
                return match;
            });
            
            if (!client) {
                console.log('❌ NO MATCH FOUND for INVENTORY token.');
                return new Response(JSON.stringify({ 
                    error: 'Invalid QR code',
                    debug: {
                        searchedFor: token,
                        totalEntitiesChecked: clients.length,
                        sampleEntities: clients.slice(0, 3).map(c => ({ id: c.id, inventory_qr_token: c.inventory_qr_token, name: c.name }))
                    }
                }), { 
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            }
            console.log('✅ Client found for inventory:', client.name);

            return new Response(JSON.stringify({
                client: {
                    id: client.id,
                    name: client.name,
                    code: client.code,
                    tenant_id: client.tenant_id
                }
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        console.log(`❓ Unknown token type: ${tokenType}`);
        return new Response(JSON.stringify({ error: `Invalid token type: ${tokenType}` }), { 
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (error) {
        console.error('❌ validateQRToken error:', error);
        console.error('Error stack:', error.stack);
        return new Response(JSON.stringify({ 
            error: error.message,
            stack: error.stack 
        }), { 
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
});