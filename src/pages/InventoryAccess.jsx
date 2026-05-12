import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Loader2, AlertCircle, ArrowRight } from "lucide-react";

export default function InventoryAccess() {
  const [token, setToken] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let foundToken = urlParams.get('token');
    
    if (!foundToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      foundToken = hashParams.get('token');
    }
    
    console.log('Inventory Access - Token:', foundToken);
    setToken(foundToken);
  }, []);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-inventory', token],
    queryFn: async () => {
      if (!token) return null;
      const clients = await base44.entities.Client.list();
      return clients.find(c => c.inventory_qr_token === token) || null;
    },
    enabled: !!token,
    retry: false
  });

  const handleGoToInventory = () => {
    setRedirecting(true);
    // Redirect to Inventory page with client filter
    window.location.href = `/Inventory?client=${client.id}`;
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This link appears to be incomplete. Please scan a valid inventory QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Client Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This QR code does not match any client in the system. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white text-center pb-8">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl">Inventory Management</CardTitle>
          <p className="text-purple-100 mt-2">{client.name}</p>
        </CardHeader>
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              Access Inventory
            </h3>
            <p className="text-gray-600">
              View and manage supplies for this location
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              📦 Track stock levels<br/>
              📊 Record counts & usage<br/>
              🔔 Get reorder alerts
            </p>
          </div>

          <Button
            onClick={handleGoToInventory}
            disabled={redirecting}
            className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700"
          >
            {redirecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Go to Inventory
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}