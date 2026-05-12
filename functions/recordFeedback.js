import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { 
            tenant_id,
            client_id,
            area_id,
            rating,
            comment,
            submitted_by_name,
            submitted_by_email
        } = await req.json();

        // Create feedback record (no auth required - public endpoint)
        const feedback = await base44.asServiceRole.entities.Feedback.create({
            tenant_id,
            client_id,
            area_id: area_id || null, // null for facility-wide feedback
            rating,
            comment: comment || '',
            submitted_by_name: submitted_by_name || null,
            submitted_by_email: submitted_by_email || null,
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown',
            feedback_timestamp: new Date().toISOString()
        });

        return Response.json({ 
            success: true, 
            feedback_id: feedback.id 
        });

    } catch (error) {
        console.error('recordFeedback error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});