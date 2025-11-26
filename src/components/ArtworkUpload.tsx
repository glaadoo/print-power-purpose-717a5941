import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileImage, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ArtworkUploadProps = {
  productId: string;
  productName: string;
  onUploadComplete: (fileUrl: string, fileName: string) => void;
  initialFileUrl?: string;
  initialFileName?: string;
};

export default function ArtworkUpload({
  productId,
  productName,
  onUploadComplete,
  initialFileUrl,
  initialFileName,
}: ArtworkUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
  } | null>(
    initialFileUrl && initialFileName
      ? { url: initialFileUrl, name: initialFileName }
      : null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialFileUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
      "application/postscript", // .ai files
      "image/svg+xml",
    ];
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.ai')) {
      toast.error("Invalid file type", {
        description: "Please upload PNG, JPG, PDF, AI, or SVG files only.",
      });
      return;
    }

    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Please upload files smaller than 50MB.",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedProductName = productName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const fileExt = file.name.split('.').pop();
      const fileName = `${sanitizedProductName}-${timestamp}.${fileExt}`;
      const filePath = `artwork/${productId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("customer-artwork")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("customer-artwork")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null); // No preview for PDFs/AI files
      }

      setUploadedFile({
        url: publicUrl,
        name: file.name,
      });

      onUploadComplete(publicUrl, file.name);

      toast.success("Artwork uploaded successfully!", {
        description: "Your design file has been attached to this product.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description: error.message || "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onUploadComplete("", "");
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Your Design File <span className="text-red-600">*</span>
        </label>
        {uploadedFile && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>Uploaded</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,.ai,.svg"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {!uploadedFile ? (
        <button
          onClick={triggerFileInput}
          disabled={uploading}
          className="w-full p-6 border-2 border-dashed border-blue-300 rounded-xl bg-white hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-medium mb-1">
                {uploading ? "Uploading..." : "Click to upload your design"}
              </p>
              <p className="text-xs text-gray-600">
                PNG, JPG, PDF, AI, or SVG (Max 50MB)
              </p>
            </div>
          </div>
        </button>
      ) : (
        <div className="p-4 bg-white rounded-xl border-2 border-green-200">
          <div className="flex items-start gap-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Artwork preview"
                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                <FileImage className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Artwork uploaded successfully
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Remove artwork"
            >
              <X className="w-4 h-4 text-gray-600 hover:text-gray-900" />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Your artwork will be printed exactly as uploaded. Please ensure your file meets the vendor's specifications.
      </p>
    </div>
  );
}
