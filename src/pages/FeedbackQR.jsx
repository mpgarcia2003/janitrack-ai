import { useState, useEffect } from "react";
import { apiInvoke } from "@/lib/api-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";
import { trackEvent, EVENTS } from "@/lib/analytics";

function readTokens() {
  if (typeof window === "undefined") return { areaToken: null, facilityToken: null };
  const search = new URLSearchParams(window.location.search);
  const hashParams =
    window.location.hash && window.location.hash.includes("?")
      ? new URLSearchParams(window.location.hash.split("?")[1])
      : new URLSearchParams();
  return {
    areaToken: search.get("token") ?? hashParams.get("token"),
    facilityToken: search.get("facilityToken") ?? hashParams.get("facilityToken"),
  };
}

export default function FeedbackQR() {
  const [areaToken, setAreaToken] = useState(null);
  const [facilityToken, setFacilityToken] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { areaToken: a, facilityToken: f } = readTokens();
    setAreaToken(a);
    setFacilityToken(f);
  }, []);

  const isFacilityScope = !!facilityToken;
  const activeToken = isFacilityScope ? facilityToken : areaToken;
  const tokenType = isFacilityScope ? "facility-feedback" : "area";

  const tokenQuery = useQuery({
    queryKey: ["feedback-token", tokenType, activeToken],
    queryFn: async () => {
      const response = await apiInvoke("validate-qr-token", {
        token: activeToken,
        tokenType,
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    enabled: !!activeToken,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (values) => {
      const response = await apiInvoke("record-feedback", {
        token: activeToken,
        scope: isFacilityScope ? "facility" : "area",
        rating: values.rating,
        comment: values.comment,
        submitted_by_name: values.name,
        submitted_by_email: values.email,
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      setSuccess(true);
      trackEvent(EVENTS.FEEDBACK_SUBMITTED, { scope: isFacilityScope ? "facility" : "area", feedback_id: data?.feedback_id });
    },
    onError: (error) => reportError(error, { where: "FeedbackQR.recordFeedback" }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    const formData = new FormData(e.target);
    submitMutation.mutate({
      rating,
      comment: formData.get("comment") ?? "",
      name: formData.get("name") ?? "",
      email: formData.get("email") ?? "",
    });
  };

  const locationName = isFacilityScope ? tokenQuery.data?.client?.name : tokenQuery.data?.area?.name;
  const clientName = tokenQuery.data?.client?.name;

  if (!activeToken) {
    return (
      <Wrapper bg="from-purple-50 to-pink-100">
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
      </Wrapper>
    );
  }

  if (tokenQuery.isLoading) {
    return (
      <Wrapper bg="from-purple-50 to-pink-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </Wrapper>
    );
  }

  if (tokenQuery.isError) {
    return (
      <Wrapper bg="from-purple-50 to-pink-100">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Location Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              {tokenQuery.error?.message ?? "This QR code does not match any location."}
            </p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  if (success) {
    return (
      <Wrapper bg="from-emerald-50 to-emerald-100">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl text-emerald-700">Thank You!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-gray-700">Your feedback has been submitted</p>
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                />
              ))}
            </div>
            {isFacilityScope ? (
              <p className="text-gray-600">Your feedback helps {clientName} maintain quality</p>
            ) : (
              <p className="text-gray-600">
                Your feedback helps keep <strong>{locationName}</strong> clean
              </p>
            )}
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Star className="w-7 h-7" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {isFacilityScope ? "Rate This Facility" : "Rate This Area"}
                </CardTitle>
                <p className="text-purple-100 text-sm">{locationName}</p>
                {!isFacilityScope && clientName ? (
                  <p className="text-purple-100 text-xs">{clientName}</p>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <Label className="text-lg mb-4 block">How would you rate the cleanliness?</Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 ? (
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {rating === 5 && "Excellent!"}
                    {rating === 4 && "Very Good"}
                    {rating === 3 && "Good"}
                    {rating === 2 && "Needs Improvement"}
                    {rating === 1 && "Poor"}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="comment">Additional Comments (Optional)</Label>
                <Textarea
                  id="comment"
                  name="comment"
                  placeholder="Tell us more about your experience…"
                  className="mt-2 h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Your Name (Optional)</Label>
                  <Input id="name" name="name" type="text" placeholder="Name" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email">Your Email (Optional)</Label>
                  <Input id="email" name="email" type="email" placeholder="email@example.com" className="mt-2" />
                </div>
              </div>

              {submitMutation.isError ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                  {submitMutation.error?.message ?? "Failed to submit feedback."}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={rating === 0 || submitMutation.isPending}
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" aria-hidden="true" />
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

function Wrapper({ bg, children }) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${bg} flex items-center justify-center p-4`}>{children}</div>
  );
}
