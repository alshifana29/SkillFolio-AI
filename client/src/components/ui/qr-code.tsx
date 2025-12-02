import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download } from "lucide-react";

interface QRCodeDisplayProps {
  qrCodeData: string;
  title?: string;
}

export function QRCodeDisplay({ qrCodeData, title = "Certificate QR Code" }: QRCodeDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeData;
    link.download = `${title.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="qr-code-trigger">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="qr-code-container">
            <img 
              src={qrCodeData} 
              alt="QR Code" 
              className="w-48 h-48"
              data-testid="qr-code-image"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to verify the certificate on the blockchain
          </p>
          <Button onClick={downloadQR} className="w-full" data-testid="download-qr-button">
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
