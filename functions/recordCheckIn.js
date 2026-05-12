import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { 
            area_id, 
            client_id, 
            tenant_id, 
            cleaner_name, 
            notes,
            photo_url,
            device_timestamp,
            timezone,
            latitude,
            longitude,
            location_accuracy
        } = await req.json();

        // Create cleaning event (no auth required - public endpoint)
        const event = await base44.asServiceRole.entities.CleaningEvent.create({
            tenant_id,
            client_id,
            area_id,
            cleaner_name,
            notes: notes || '',
            photo_url: photo_url || null,
            server_timestamp: new Date().toISOString(),
            device_timestamp: device_timestamp || new Date().toISOString(),
            timezone: timezone || 'America/New_York',
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown',
            latitude: latitude || null,
            longitude: longitude || null,
            location_accuracy: location_accuracy || null,
            status: 'completed'
        });

        // Update area's last_cleaned_at
        await base44.asServiceRole.entities.Area.update(area_id, {
            last_cleaned_at: new Date().toISOString()
        });

        return Response.json({ 
            success: true, 
            event_id: event.id 
        });

    } catch (error) {
        console.error('recordCheckIn error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});