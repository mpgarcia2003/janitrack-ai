import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { apiInvoke } from "@/lib/api-client";
import { qrUrls } from "@/lib/qr-urls";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { reportError } from "@/lib/error-reporting";

export default function QRCodeDisplay({ token, areaName, clientCode, clientName }) {
  const scanUrl = qrUrls.scanCheckIn(token);

  const downloadBrandedQR = async () => {
    try {
      trackEvent(EVENTS.QR_CODE_DOWNLOADED, { type: "cleaning", token });
      const response = await apiInvoke("generate-branded-qr", {
        url: scanUrl,
        qrType: "cleaning",
        clientName,
        areaName,
      });
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(response.data?.html ?? "");
      win.document.close();
      setTimeout(() => win.print(), 500);
    } catch (error) {
      reportError(error, { where: "QRCodeDisplay.downloadBrandedQR" });
      downloadSimpleQR();
    }
  };

  const downloadSimpleQR = async () => {
    try {
      const response = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${clientCode ?? "area"}_${(areaName ?? "area").replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      reportError(error, { where: "QRCodeDisplay.downloadSimpleQR" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`}
          alt={`QR Code for ${areaName}`}
          className="w-full h-auto"
        />
      </div>
      <div className="text-xs text-gray-500 font-mono break-all p-2 bg-gray-50 rounded">{scanUrl}</div>
      <Button variant="outline" className="w-full" onClick={downloadBrandedQR}>
        <Download className="w-4 h-4 mr-2" aria-hidden="true" />
        Download Branded QR Code
      </Button>
    </div>
  );
}
