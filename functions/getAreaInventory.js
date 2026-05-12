import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { client_id } = await req.json();

        // Get all inventory items for this client (no auth required - public endpoint)
        const inventory = await base44.asServiceRole.entities.InventoryItem.filter({
            client_id: client_id,
            active: true
        });

        // Return formatted inventory
        return Response.json({
            success: true,
            items: inventory.map(item => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                category: item.category,
                unit: item.unit,
                on_hand: item.on_hand,
                par_level: item.par_level,
                reorder_point: item.reorder_point,
                status: item.reorder_point && item.on_hand <= item.reorder_point 
                    ? 'critical' 
                    : item.par_level && item.on_hand < item.par_level 
                    ? 'low' 
                    : 'good'
            }))
        });

    } catch (error) {
        console.error('getAreaInventory error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});