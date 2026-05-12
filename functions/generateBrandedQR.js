
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || !user.tenant_id) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url, qrType, clientName, areaName } = await req.json();

        const tenants = await base44.asServiceRole.entities.Tenant.list();
        const tenant = tenants.find(t => t.id === user.tenant_id);

        if (!tenant) {
            return Response.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // QR Type specific titles and instructions
        const qrConfig = {
            'cleaning': {
                title: 'CLEANING CHECK-IN',
                instruction: 'Scan the QR code below to check in when cleaning this area.'
            },
            'facility-feedback': {
                title: 'FACILITY FEEDBACK',
                instruction: 'Scan the QR code below to share your feedback about our facility.'
            },
            'area-feedback': {
                title: `${areaName?.toUpperCase() || 'AREA'} FEEDBACK`,
                instruction: 'Scan the QR code below to rate the cleanliness of this area.'
            },
            'project': {
                title: 'PROJECT SUBMISSION',
                instruction: 'Scan the QR code below to report maintenance issues or request work.'
            },
            'inventory': {
                title: 'INVENTORY MANAGEMENT',
                instruction: 'Scan the QR code below to access inventory for this location.'
            }
        };

        const config = qrConfig[qrType] || qrConfig['facility-feedback'];

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { 
            margin: 0.5in; 
            size: letter portrait;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: white;
            width: 100%;
            padding: 40px 60px;
            text-align: center;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 30px;
        }
        .client-name {
            font-size: 44px;
            font-weight: 900;
            letter-spacing: 1px;
            margin-bottom: 12px;
            text-transform: uppercase;
            color: #000;
            line-height: 1.1;
        }
        .qr-title {
            font-size: 48px;
            font-weight: 900;
            letter-spacing: 2px;
            margin-bottom: 18px;
            text-transform: uppercase;
            color: #000;
            line-height: 1.1;
        }
        .separator {
            width: 100%;
            height: 8px;
            background: ${tenant.brand_color || '#10b981'};
            margin: 20px auto;
            border-radius: 4px;
        }
        .instructions {
            font-size: 20px;
            line-height: 1.5;
            margin: 25px auto;
            max-width: 600px;
            color: #333;
        }
        .qr-container {
            margin: 35px auto;
            display: flex;
            justify-content: center;
        }
        .qr-container img {
            width: 400px;
            height: 400px;
            display: block;
        }
        .contact {
            font-size: 18px;
            margin: 30px auto;
            color: #444;
        }
        .footer {
            margin-top: 35px;
        }
        .company-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 18px;
            margin-bottom: 12px;
        }
        .company-logo {
            max-height: 70px;
            max-width: 140px;
            object-fit: contain;
        }
        .company-name {
            font-size: 42px;
            font-weight: 900;
            color: ${tenant.company_name_color || '#000000'};
            text-transform: uppercase;
            letter-spacing: 1px;
            line-height: 1.1;
        }
        .tagline {
            font-size: 16px;
            font-style: italic;
            color: #666;
            margin-top: 10px;
        }
        
        @media print {
            body {
                padding: 30px 50px;
            }
            .client-name {
                font-size: 42px;
            }
            .qr-title {
                font-size: 46px;
            }
            .qr-container img {
                width: 380px;
                height: 380px;
            }
            .company-name {
                font-size: 40px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${clientName ? `<div class="client-name">${clientName.toUpperCase()}</div>` : ''}
            <div class="qr-title">${config.title}</div>
            <div class="separator"></div>
            <div class="instructions">${config.instruction}</div>
        </div>

        <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}" alt="QR Code">
        </div>

        ${(tenant.contact_name || tenant.contact_email) ? `
        <div class="contact">
            Questions? ${tenant.contact_name || ''}${tenant.contact_name && tenant.contact_email ? ' • ' : ''}${tenant.contact_email || ''}
        </div>
        ` : ''}

        <div class="footer">
            <div class="company-row">
                ${tenant.logo_url ? `<img src="${tenant.logo_url}" alt="Logo" class="company-logo">` : ''}
                <div class="company-name">${tenant.name}</div>
            </div>
            ${tenant.tagline ? `<div class="tagline">${tenant.tagline}</div>` : ''}
        </div>
    </div>
</body>
</html>
        `;

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html',
            },
        });

    } catch (error) {
        console.error('Error generating branded QR:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
