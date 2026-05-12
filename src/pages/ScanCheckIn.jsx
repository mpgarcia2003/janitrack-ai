import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, AlertCircle, MapPin, Loader2 } from "lucide-react";

export default function ScanCheckIn() {
  const [token, setToken] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => console.log('Geolocation error:', error)
      );
    }

    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    let foundToken = urlParams.get('token');
    
    if (!foundToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      foundToken = hashParams.get('token');
    }
    
    console.log('Extracted token:', foundToken);
    setToken(foundToken);
  }, []);

  const { data: area, isLoading: areaLoading } = useQuery({
    queryKey: ['area-scan', token],
    queryFn: async () => {
      if (!token) return null;
      console.log('Searching for area with token:', token);
      
      const areas = await base44.entities.Area.list();
      const foundArea = areas.find(a => a.qr_token === token);
      console.log('Found area:', foundArea);
      return foundArea || null;
    },
    enabled: !!token,
    retry: false
  });

  const { data: client } = useQuery({
    queryKey: ['client-scan', area?.client_id],
    queryFn: async () => {
      if (!area?.client_id) return null;
      const clients = await base44.entities.Client.list();
      return clients.find(c => c.id === area.client_id) || null;
    },
    enabled: !!area?.client_id,
    retry: false
  });

  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      let photoUrl = null;
      if (photo) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
        photoUrl = file_url;
      }

      const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const event = await base44.entities.CleaningEvent.create({
        tenant_id: area.tenant_id,
        client_id: area.client_id,
        area_id: area.id,
        cleaner_name: data.cleanerName,
        notes: data.notes,
        photo_url: photoUrl,
        server_timestamp: new Date().toISOString(),
        device_timestamp: new Date().toISOString(),
        timezone: localTimezone,
        ip_address: 'captured-by-system',
        user_agent: navigator.userAgent,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location_accuracy: location?.accuracy,
        status: 'completed'
      });

      await base44.entities.Area.update(area.id, {
        last_cleaned_at: new Date().toISOString()
      });

      return event;
    },
    onSuccess: () => {
      setSuccess(true);
    },
  });

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createEventMutation.mutate({
      cleanerName: formData.get('cleanerName'),
      notes: formData.get('notes') || ''
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This link appears to be incomplete. Please scan a valid QR code from your area labels.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (areaLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading area information...</p>
        </div>
      </div>
    );
  }

  if (!area) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Area Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This QR code does not match any area in the system. Please contact your supervisor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-700">Check-In Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              Thank you for cleaning <strong>{area.name}</strong>
            </p>
            {client && (
              <p className="text-gray-600">
                at {client.name}
              </p>
            )}
            <div className="pt-6">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Scan Another Area
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-7 h-7" />
              </div>
              <div>
                <CardTitle className="text-2xl">{area.name}</CardTitle>
                {client && <p className="text-blue-100 text-sm">{client.name}</p>}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="cleanerName" className="text-lg">Your Name *</Label>
                <Input
                  id="cleanerName"
                  name="cleanerName"
                  required
                  placeholder="Enter your name"
                  className="mt-2 h-12 text-lg"
                />
              </div>

              <div>
                <Label className="text-lg mb-3 block">
                  <Camera className="w-5 h-5 inline mr-2" />
                  Take a Photo (Optional)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-white"
                    >
                      Change Photo
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-blue-500"
                  >
                    <Camera className="w-8 h-8 text-gray-400" />
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-lg">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any issues or observations..."
                  className="mt-2 h-24"
                />
              </div>

              {location && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <MapPin className="w-4 h-4" />
                  <span>Location captured (±{Math.round(location.accuracy)}m)</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={createEventMutation.isPending}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {createEventMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Complete Check-In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}