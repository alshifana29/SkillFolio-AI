import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
}

export function QRScanner({ open, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "qr-scanner-container",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        setLoading(true);
        try {
          const hashMatch = decodedText.match(/verify\/([a-f0-9]+)/);
          const hash = hashMatch ? hashMatch[1] : decodedText;

          const response = await fetch(`/api/verify/${hash}`, {
            headers: getAuthHeaders(),
          });

          if (!response.ok) {
            throw new Error("Certificate not found");
          }

          const data = await response.json();
          setVerificationResult(data);
          scanner.pause();
          toast({
            title: "Certificate Verified",
            description: "QR code scanned successfully",
          });
        } catch (error: any) {
          toast({
            title: "Verification Failed",
            description: error.message || "Could not verify certificate",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.log("QR scan error:", error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [open]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setVerificationResult(null);
    onClose();
  };

  const handleRescan = () => {
    setVerificationResult(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>QR Code Scanner</DialogTitle>
        </DialogHeader>

        {!verificationResult ? (
          <div className="space-y-4">
            <div id="qr-scanner-container" className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Point your camera at the QR code on the certificate
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {verificationResult.verified ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Certificate Verified ✓</h3>
                  {verificationResult.certificate && (
                    <Card className="p-3 space-y-2 bg-muted/30 border-0">
                      <div>
                        <p className="text-xs text-muted-foreground">Certificate Title</p>
                        <p className="font-medium text-foreground">{verificationResult.certificate.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Institution</p>
                        <p className="font-medium text-foreground">{verificationResult.certificate.institution}</p>
                      </div>
                      {verificationResult.owner && (
                        <div>
                          <p className="text-xs text-muted-foreground">Issued To</p>
                          <p className="font-medium text-foreground">
                            {verificationResult.owner.firstName} {verificationResult.owner.lastName}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Issued Date</p>
                        <p className="font-medium text-foreground">
                          {new Date(verificationResult.certificate.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {verificationResult.block && (
                        <div>
                          <p className="text-xs text-muted-foreground">Blockchain Block</p>
                          <p className="font-medium text-foreground text-xs truncate">
                            {verificationResult.block.hash}
                          </p>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-foreground text-center">Verification Failed</h3>
                <p className="text-sm text-muted-foreground text-center">
                  This certificate could not be verified. It may be forged or not in the system.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleRescan} variant="outline" className="flex-1">
                Rescan
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
