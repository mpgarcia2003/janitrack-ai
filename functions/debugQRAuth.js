import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qrUrl, codeSnippets } = await req.json();

    // Test the QR URL from backend (no auth required)
    let testResult = null;
    if (qrUrl) {
      try {
        const testResponse = await fetch(qrUrl, {
          method: 'GET',
          redirect: 'manual', // Don't follow redirects
          headers: {
            'User-Agent': 'JaniTrack-Debugger/1.0'
          }
        });

        testResult = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          redirected: testResponse.redirected,
          location: testResponse.headers.get('location'),
          contentType: testResponse.headers.get('content-type'),
          hasAuthRedirect: testResponse.status === 302 || testResponse.status === 301,
          body: testResponse.status === 200 ? await testResponse.text() : null
        };
      } catch (error) {
        testResult = {
          error: error.message,
          description: 'Failed to fetch QR URL'
        };
      }
    }

    const prompt = `You are debugging a Base44 authentication issue with QR code pages.

PROBLEM:
QR code pages (ScanCheckIn, FeedbackQR, NewProjectQR) should be publicly accessible but are redirecting to login.

${qrUrl ? `
TEST URL PROVIDED: ${qrUrl}

ACTUAL TEST RESULTS FROM SERVER:
${JSON.stringify(testResult, null, 2)}

ANALYSIS NEEDED:
- Why is this URL redirecting (if it is)?
- What headers/response indicate the auth check?
- How can we bypass this in the code?
` : ''}

CURRENT IMPLEMENTATION:
${JSON.stringify(codeSnippets, null, 2)}

BASE44 FRAMEWORK CONSTRAINTS:
- Cannot edit App.jsx or base44Client.js (framework files)
- Can only modify: pages/, components/, layout.js, functions/
- Layout.jsx tries to detect public pages and skip auth
- Created PublicAPIClient with requiresAuth: false
- Wrapped QR pages with withPublicAccess HOC

YOUR TASK:
1. Analyze the test results (if provided) to identify where auth is enforced
2. Explain WHY the current solution isn't working
3. Provide a NEW working solution using only editable files
4. Include step-by-step implementation code
5. Suggest alternative approaches if current path won't work

Be technical and specific. Show actual code changes needed.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const analysis = message.content[0].text;

    return Response.json({
      success: true,
      analysis,
      testResult,
      model: message.model,
      tokens: message.usage
    });

  } catch (error) {
    console.error('Claude API Error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});