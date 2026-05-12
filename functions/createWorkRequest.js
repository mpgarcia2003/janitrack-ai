import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { 
            tenant_id,
            client_id,
            title,
            description,
            priority,
            category,
            photo_url,
            submitted_by_name,
            submitted_by_email
        } = await req.json();

        // Create project (no auth required - public endpoint)
        const project = await base44.asServiceRole.entities.Project.create({
            tenant_id,
            client_id,
            title,
            description: description || '',
            status: 'open',
            priority: priority || 'medium',
            // Store submission info in description or notes field
            assigned_to_name: submitted_by_name || 'Public Submission',
        });

        return Response.json({ 
            success: true, 
            project_id: project.id 
        });

    } catch (error) {
        console.error('createWorkRequest error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});