import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function QRCodeDisplay({ token, areaName, clientCode, clientName }) {
  // UPDATED: Point to scanner app instead of main app
  const scanUrl = `https://jani-track-scanner-050b61a3.base44.app/ScanCheckIn?token=${token}`;
  
  const downloadBrandedQR = async () => {
    try {
      const response = await base44.functions.invoke('generateBrandedQR', {
        url: scanUrl,
        qrType: 'cleaning',
        clientName: clientName,
        areaName: areaName
      });

      const win = window.open('', '_blank');
      win.document.write(response.data);
      win.document.close();
      
      setTimeout(() => {
        win.print();
      }, 500);
    } catch (error) {
      console.error('Error generating branded QR:', error);
      downloadSimpleQR();
    }
  };

  const downloadSimpleQR = async () => {
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${clientCode || 'area'}_${areaName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR code:', error);
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
      <div className="text-xs text-gray-500 font-mono break-all p-2 bg-gray-50 rounded">
        {scanUrl}
      </div>
      <Button 
        variant="outline" 
        className="w-full"
        onClick={downloadBrandedQR}
      >
        <Download className="w-4 h-4 mr-2" />
        Download Branded QR Code
      </Button>
    </div>
  );
}