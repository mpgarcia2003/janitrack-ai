import { useState, useEffect } from "react";
import { base44Public } from "@/components/PublicAPIClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FeedbackQR() {
  const [token, setToken] = useState(null);
  const [facilityToken, setFacilityToken] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    let areaToken = urlParams.get('token');
    if (!areaToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      areaToken = hashParams.get('token');
    }
    
    let facToken = urlParams.get('facilityToken');
    if (!facToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      facToken = hashParams.get('facilityToken');
    }
    
    console.log('Feedback tokens:', { areaToken, facilityToken: facToken });
    setToken(areaToken);
    setFacilityToken(facToken);
  }, []);

  const { data: area, isLoading: areaLoading } = useQuery({
    queryKey: ['area-feedback', token],
    queryFn: async () => {
      if (!token) return null;
      const areas = await base44Public.entities.Area.list();
      return areas.find(a => a.qr_token === token) || null;
    },
    enabled: !!token,
    retry: false
  });

  const { data: facilityClient, isLoading: facilityLoading } = useQuery({
    queryKey: ['facility-feedback', facilityToken],
    queryFn: async () => {
      if (!facilityToken) return null;
      const clients = await base44Public.entities.Client.list();
      return clients.find(c => c.feedback_qr_token === facilityToken) || null;
    },
    enabled: !!facilityToken,
    retry: false
  });

  const { data: client } = useQuery({
    queryKey: ['client-feedback', area?.client_id],
    queryFn: async () => {
      if (!area?.client_id) return null;
      const clients = await base44Public.entities.Client.list();
      return clients.find(c => c.id === area.client_id) || null;
    },
    enabled: !!area?.client_id,
    retry: false
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const isFacilityFeedback = !!facilityClient;
      
      return await base44Public.entities.Feedback.create({
        tenant_id: isFacilityFeedback ? facilityClient.tenant_id : area.tenant_id,
        client_id: isFacilityFeedback ? facilityClient.id : area.client_id,
        area_id: isFacilityFeedback ? null : area.id,
        rating: data.rating,
        comment: data.comment,
        submitted_by_name: data.name || 'Anonymous',
        submitted_by_email: data.email || null,
        ip_address: 'captured-by-system',
        user_agent: navigator.userAgent,
        feedback_timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      setSuccess(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    const formData = new FormData(e.target);
    submitFeedbackMutation.mutate({
      rating,
      comment: formData.get('comment') || '',
      name: formData.get('name') || '',
      email: formData.get('email') || ''
    });
  };

  const isFacilityFeedback = !!facilityToken && !!facilityClient;
  const isAreaFeedback = !!token && !!area;
  const isLoading = (!!token && areaLoading) || (!!facilityToken && facilityLoading);
  
  const locationName = isFacilityFeedback 
    ? facilityClient?.name 
    : area?.name;
  const clientName = isFacilityFeedback 
    ? facilityClient?.name 
    : client?.name;

  if (!token && !facilityToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This link appears to be incomplete. Please scan a valid feedback QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAreaFeedback && !isFacilityFeedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Location Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This QR code does not match any location in the system.
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
            <CardTitle className="text-3xl text-green-700">Thank You!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              Your feedback has been submitted
            </p>
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            {isFacilityFeedback ? (
              <p className="text-gray-600">
                Your feedback helps {clientName} maintain quality
              </p>
            ) : (
              <p className="text-gray-600">
                Your feedback helps keep <strong>{locationName}</strong> clean
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Star className="w-7 h-7" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {isFacilityFeedback ? 'Rate This Facility' : 'Rate This Area'}
                </CardTitle>
                {isFacilityFeedback ? (
                  <p className="text-purple-100 text-sm">{clientName}</p>
                ) : (
                  <>
                    <p className="text-purple-100 text-sm">{locationName}</p>
                    {client && <p className="text-purple-100 text-xs">{clientName}</p>}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <Label className="text-lg mb-4 block">
                  How would you rate the cleanliness?
                </Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {rating === 5 && "Excellent! ⭐"}
                    {rating === 4 && "Very Good 👍"}
                    {rating === 3 && "Good"}
                    {rating === 2 && "Needs Improvement"}
                    {rating === 1 && "Poor"}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="comment">Additional Comments (Optional)</Label>
                <Textarea
                  id="comment"
                  name="comment"
                  placeholder="Tell us more about your experience..."
                  className="mt-2 h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Your Name (Optional)</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Your Email (Optional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    className="mt-2"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={rating === 0 || submitFeedbackMutation.isPending}
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {submitFeedbackMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submit Feedback
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