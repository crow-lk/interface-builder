import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"];

interface FileUploadCardProps {
  label: string;
  description: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const FileUploadCard = ({ label, description, file, onFileChange }: FileUploadCardProps) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateExtension = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!validateExtension(f)) {
      alert("Unsupported file type. Please upload PDF, DOCX, TXT, PNG, JPG, or JPEG.");
      return;
    }
    onFileChange(f);
  };

  return (
    <Card className={`transition-all duration-200 ${dragOver ? "ring-2 ring-primary border-primary" : ""}`}>
      <CardContent className="p-6">
        <h3 className="font-sans font-semibold text-foreground mb-1">{label}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>

        {file ? (
          <div className="flex items-center gap-3 bg-muted rounded-lg p-3">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate flex-1">{file.name}</span>
            <button
              onClick={() => onFileChange(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-input rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag & drop or <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, PNG, JPG</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </CardContent>
    </Card>
  );
};

export default FileUploadCard;
