import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FolderKanban } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ProjectQRDisplay({ token, clientName, clientCode, qrTitle, qrCompanyNameColor }) {
  // UPDATED: Point to scanner app
  const projectUrl = `https://jani-track-scanner-050b61a3.base44.app/NewProjectQR?token=${token}`;
  
  const downloadBrandedQR = async () => {
    try {
      const response = await base44.functions.invoke('generateBrandedQR', {
        url: projectUrl,
        qrType: 'project',
        clientName: clientName,
        qrTitle: qrTitle,
        qrCompanyNameColor: qrCompanyNameColor
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
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(projectUrl)}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Project_QR_${clientCode || 'client'}_${clientName.replace(/\s+/g, '_')}.png`;
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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(projectUrl)}`}
          alt={`Project QR Code for ${clientName}`}
          className="w-full h-auto"
        />
      </div>
      <div className="text-xs text-gray-500 font-mono break-all p-2 bg-blue-50 rounded">
        {projectUrl}
      </div>
      <Button 
        variant="outline" 
        className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
        onClick={downloadBrandedQR}
      >
        <Download className="w-4 h-4 mr-2" />
        Download Branded Project QR
      </Button>
    </div>
  );
}