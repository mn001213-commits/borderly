"use client";

import { useState, useRef, DragEvent, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface DragDropUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  existingFiles?: File[];
  className?: string;
}

export function DragDropUpload({
  onFilesSelected,
  maxFiles = 4,
  acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4"],
  maxSizeMB = 10,
  existingFiles = [],
  className = "",
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    // 파일 수 제한
    const totalFiles = existingFiles.length + previewUrls.length + files.length;
    if (totalFiles > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // 파일 타입 및 크기 검증
    const validFiles = files.filter((file) => {
      if (!acceptedTypes.includes(file.type)) {
        alert(`${file.name}: Invalid file type`);
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`${file.name}: File too large (max ${maxSizeMB}MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // 미리보기 생성
    const urls = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...urls]);

    onFilesSelected(validFiles);
  };

  const removeFile = (index: number) => {
    setPreviewUrls((prev) => {
      const newUrls = [...prev];
      URL.revokeObjectURL(newUrls[index]);
      newUrls.splice(index, 1);
      return newUrls;
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  return (
    <div className={className}>
      {/* 드래그앤드랍 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload files by dragging or clicking"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-gray-300 hover:border-primary/50 hover:bg-gray-50"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`
            p-4 rounded-full transition-colors
            ${isDragging ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}
          `}
          >
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <p className="font-medium text-gray-900">
              {isDragging ? "Drop files here" : "Drag & drop files"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse (max {maxFiles} files, {maxSizeMB}MB each)
            </p>
          </div>
        </div>
      </div>

      {/* 미리보기 그리드 */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {previewUrls.map((url, index) => (
            <div key={url} className="relative aspect-square group">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full
                         opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
