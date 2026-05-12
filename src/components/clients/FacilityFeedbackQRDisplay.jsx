import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { apiInvoke } from "@/lib/api-client";
import { qrUrls } from "@/lib/qr-urls";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { reportError } from "@/lib/error-reporting";

export default function FacilityFeedbackQRDisplay({ token, clientName, clientCode }) {
  const feedbackUrl = qrUrls.facilityFeedback(token);

  const downloadBrandedQR = async () => {
    try {
      trackEvent(EVENTS.QR_CODE_DOWNLOADED, { type: "facility-feedback", token });
      const response = await apiInvoke("generate-branded-qr", {
        url: feedbackUrl,
        qrType: "facility-feedback",
        clientName,
      });
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(response.data?.html ?? "");
      win.document.close();
      setTimeout(() => win.print(), 500);
    } catch (error) {
      reportError(error, { where: "FacilityFeedbackQRDisplay.downloadBrandedQR" });
      downloadSimpleQR();
    }
  };

  const downloadSimpleQR = async () => {
    try {
      const response = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(feedbackUrl)}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Facility_Feedback_QR_${clientCode ?? "facility"}_${(clientName ?? "facility").replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      reportError(error, { where: "FacilityFeedbackQRDisplay.downloadSimpleQR" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border-2 border-emerald-200">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(feedbackUrl)}`}
          alt={`Facility Feedback QR Code for ${clientName}`}
          className="w-full h-auto"
        />
      </div>
      <div className="text-xs text-gray-500 font-mono break-all p-2 bg-emerald-50 rounded">{feedbackUrl}</div>
      <Button
        variant="outline"
        className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
        onClick={downloadBrandedQR}
      >
        <Download className="w-4 h-4 mr-2" aria-hidden="true" />
        Download Branded Facility QR
      </Button>
    </div>
  );
}
