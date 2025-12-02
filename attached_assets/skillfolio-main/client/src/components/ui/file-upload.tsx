import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, File, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  className?: string;
}

export function FileUpload({ 
  onFileSelect, 
  acceptedTypes = ['image/*', 'application/pdf'],
  maxSize = 10 * 1024 * 1024, // 10MB
  className 
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: false,
  });

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <Card className={`file-upload-zone p-8 text-center ${isDragActive ? 'dragover' : ''} ${className}`}>
      {!selectedFile ? (
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} data-testid="file-input" />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            {isDragActive ? 'Drop the file here' : 'Drag and drop your certificate here'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
          <Button type="button" variant="outline" data-testid="browse-files-button">
            Browse Files
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeFile}
            data-testid="remove-file-button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
