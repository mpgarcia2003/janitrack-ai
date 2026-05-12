import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, CheckCircle, AlertCircle, ExternalLink, TestTube } from "lucide-react";
import ReactMarkdown from "react-markdown";
import AuthGuard from "../components/AuthGuard";

export default function AIDebugger() {
  const [qrUrl, setQrUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeQRAuthIssue = async () => {
    if (!qrUrl.trim()) {
      setError('Please enter a QR code URL to test');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setTestResult(null);

    try {
      // Prepare code context for Claude
      const codeSnippets = {
        framework: "Base44",
        layoutCheck: `
          // Layout.jsx - Public page detection
          const publicPageNames = ['scancheckin', 'feedbackqr', 'newprojectqr', 'tenantsignup'];
          const isPublicPage = publicPageNames.some(publicPage =>
            pageName.includes(publicPage) || pathname.includes(publicPage) || hash.includes(publicPage)
          );
          
          if (isPublicPage) {
            return <>{children}</>;
          }
        `,
        publicClient: `
          // components/PublicAPIClient.js
          import { createClient } from '@base44/sdk';
          export const base44Public = createClient({
            appId: "68fbc12dcfae5aa4e16bffe3",
            requiresAuth: false 
          });
        `,
        hocWrapper: `
          // components/withPublicAccess.js
          export const withPublicAccess = (WrappedComponent) => {
            return function WithPublicAccessComponent(props) {
              return <WrappedComponent {...props} />;
            };
          };
        `,
        qrPageExample: `
          // pages/ScanCheckIn.js
          import { base44Public } from "../components/PublicAPIClient";
          import { withPublicAccess } from "../components/withPublicAccess";
          
          function ScanCheckIn() {
            const { data: area } = useQuery({
              queryFn: async () => {
                const areas = await base44Public.entities.Area.list();
                return areas.find(a => a.qr_token === token);
              }
            });
          }
          
          export default withPublicAccess(ScanCheckIn);
        `,
      };

      const response = await base44.functions.invoke('debugQRAuth', {
        qrUrl: qrUrl.trim(),
        codeSnippets
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
        setTestResult(response.data.testResult);
      } else {
        setError(response.data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Debug error:', err);
      setError(err.message || 'Failed to analyze issue');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Claude AI Debugger
                </h1>
                <p className="text-gray-600">Test QR code URLs and get AI-powered solutions</p>
              </div>
            </div>
          </div>

          {/* Issue Card */}
          <Card className="shadow-lg mb-6 border-2 border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
                <div>
                  <CardTitle className="text-xl text-orange-900">Current Issue</CardTitle>
                  <p className="text-sm text-orange-700 mt-2">
                    QR code pages redirect to login instead of loading publicly for anonymous users.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-orange-800">
                <p>✅ <strong>Implemented:</strong> PublicAPIClient with requiresAuth: false</p>
                <p>✅ <strong>Implemented:</strong> Layout skips auth for public pages</p>
                <p>✅ <strong>Implemented:</strong> HOC wrapper for public pages</p>
                <p>❌ <strong>Still broken:</strong> Pages redirect to login</p>
              </div>
            </CardContent>
          </Card>

          {/* Test Input Card */}
          <Card className="shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5 text-blue-600" />
                Test Your QR Code URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="qrUrl" className="text-base">
                  Enter a QR Code URL to test:
                </Label>
                <Input
                  id="qrUrl"
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                  placeholder="e.g., https://your-app.base44.app/ScanCheckIn?token=qr_123..."
                  className="mt-2 h-12"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Get this URL by clicking "Download QR" on an area, or copy it from your browser
                </p>
              </div>

              <Button
                onClick={analyzeQRAuthIssue}
                disabled={isAnalyzing || !qrUrl.trim()}
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Claude is Testing & Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-6 h-6 mr-3" />
                    Test URL & Get AI Solution
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResult && (
            <Card className="shadow-lg mb-6 border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-900">🧪 Test Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">HTTP Status</p>
                    <p className="text-lg font-semibold">{testResult.status} {testResult.statusText}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Auth Redirect?</p>
                    <Badge variant={testResult.hasAuthRedirect ? "destructive" : "default"}>
                      {testResult.hasAuthRedirect ? "YES - Redirecting to login" : "NO - Loading correctly"}
                    </Badge>
                  </div>
                </div>
                {testResult.location && (
                  <div>
                    <p className="text-sm text-gray-600">Redirect Location</p>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">{testResult.location}</p>
                  </div>
                )}
                {testResult.error && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="text-sm text-red-700">{testResult.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="shadow-lg mb-6 border-2 border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysis && (
            <Card className="shadow-lg border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Claude's Diagnosis & Solution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      code: ({ node, inline, className, children, ...props }) => (
                        inline ? (
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <code className="text-sm font-mono" {...props}>
                              {children}
                            </code>
                          </pre>
                        )
                      )
                    }}
                  >
                    {analysis}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Text */}
          {!analysis && !isAnalyzing && (
            <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  How to Get Your QR URL:
                </h3>
                <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                  <li>Go to <strong>Areas & QR Codes</strong> page</li>
                  <li>Click <strong>Download QR</strong> on any area</li>
                  <li>Right-click the QR code and select <strong>"Copy link address"</strong></li>
                  <li>Paste it in the input above</li>
                  <li>Claude will test it and tell you exactly what's wrong!</li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}