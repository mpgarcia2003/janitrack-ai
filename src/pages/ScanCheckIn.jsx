import { useState, useRef, useEffect } from "react";
import { apiInvoke } from "@/lib/api-client";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, AlertCircle, MapPin, Loader2 } from "lucide-react";
import { reportError } from "@/lib/error-reporting";
import { trackEvent, EVENTS } from "@/lib/analytics";

function readTokenFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  let token = params.get("token");
  if (!token && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    token = hashParams.get("token");
  }
  return token;
}

export default function ScanCheckIn() {
  const [token, setToken] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setToken(readTokenFromUrl());
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        (error) => reportError(error, { where: "ScanCheckIn.geolocation" })
      );
    }
  }, []);

  const tokenInfoQuery = useQuery({
    queryKey: ["scan-token", token],
    queryFn: async () => {
      const response = await apiInvoke("validate-qr-token", {
        token,
        tokenType: "area",
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data; // { area, client }
    },
    enabled: !!token,
    retry: false,
  });

  const area = tokenInfoQuery.data?.area ?? null;
  const client = tokenInfoQuery.data?.client ?? null;

  const checkInMutation = useMutation({
    mutationFn: async (formValues) => {
      let photo_url = null;
      if (photo) {
        const { file_url } = await uploadFile({ file: photo, folder: "check-ins" });
        photo_url = file_url;
      }
      const timezone =
        typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York";

      const response = await apiInvoke("record-check-in", {
        token,
        cleaner_name: formValues.cleanerName,
        notes: formValues.notes,
        photo_url,
        device_timestamp: new Date().toISOString(),
        timezone,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location_accuracy: location?.accuracy,
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      setSuccess(true);
      trackEvent(EVENTS.SCAN_CHECK_IN_COMPLETED, {
        area_id: area?.id,
        client_id: area?.client_id,
        event_id: data?.event_id,
      });
    },
    onError: (error) => reportError(error, { where: "ScanCheckIn.recordCheckIn" }),
  });

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    checkInMutation.mutate({
      cleanerName: formData.get("cleanerName"),
      notes: formData.get("notes") ?? "",
    });
  };

  if (!token) {
    return (
      <CenteredCard
        icon={<AlertCircle className="w-8 h-8 text-orange-600" />}
        title="Invalid QR Code"
        body="This link appears to be incomplete. Please scan a valid QR code from your area labels."
      />
    );
  }

  if (tokenInfoQuery.isLoading) {
    return <CenteredSpinner label="Loading area information…" />;
  }

  if (tokenInfoQuery.isError || !area) {
    return (
      <CenteredCard
        icon={<AlertCircle className="w-8 h-8 text-red-600" />}
        title="Area Not Found"
        body={tokenInfoQuery.error?.message ?? "This QR code does not match any area. Please contact your supervisor."}
      />
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl text-emerald-700">Check-In Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              Thank you for cleaning <strong>{area.name}</strong>
            </p>
            {client ? <p className="text-gray-600">at {client.name}</p> : null}
            <div className="pt-6">
              <Button onClick={() => window.location.reload()} className="w-full bg-emerald-600 hover:bg-emerald-700">
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
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-7 h-7" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl">{area.name}</CardTitle>
                {client ? <p className="text-emerald-100 text-sm">{client.name}</p> : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="cleanerName" className="text-lg">
                  Your Name *
                </Label>
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
                  <Camera className="w-5 h-5 inline mr-2" aria-hidden="true" />
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
                    className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-emerald-500"
                  >
                    <Camera className="w-8 h-8 text-gray-400" aria-hidden="true" />
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-lg">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any issues or observations…"
                  className="mt-2 h-24"
                />
              </div>

              {location ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span>Location captured (±{Math.round(location.accuracy)}m)</span>
                </div>
              ) : null}

              {checkInMutation.isError ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                  {checkInMutation.error?.message ?? "Failed to record check-in. Please try again."}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={checkInMutation.isPending}
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
              >
                {checkInMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" aria-hidden="true" />
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

function CenteredCard({ icon, title, body }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {icon}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">{body}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CenteredSpinner({ label }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-600">{label}</p>
      </div>
    </div>
  );
}
