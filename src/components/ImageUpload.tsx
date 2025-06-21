import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onImagesChange, maxImages = 5 }: ImageUploadProps) {
  const { theme } = useThemeContext();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string> => {
    // 模拟上传到 Cloudflare Images
    // 在实际应用中，这里应该调用真实的上传 API
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // 模拟网络延迟
        setTimeout(() => {
          resolve(reader.result as string);
        }, 1000);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (images.length >= maxImages) {
      alert(`最多只能上传 ${maxImages} 张图片`);
      return;
    }

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} 不是有效的图片文件`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} 文件大小超过 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const remainingSlots = maxImages - images.length;
    const filesToUpload = validFiles.slice(0, remainingSlots);

    setUploading(true);
    try {
      const uploadPromises = filesToUpload.map(uploadImage);
      const uploadedUrls = await Promise.all(uploadPromises);
      onImagesChange([...images, ...uploadedUrls]);
    } catch (error) {
      console.error('上传失败:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [images, maxImages, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
          dragOver ? 'border-blue-400 bg-blue-50' : ''
        }`}
        style={{
          borderColor: dragOver ? theme.colors.primary : theme.colors.border,
          backgroundColor: dragOver ? `${theme.colors.primary}10` : theme.colors.surface,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: theme.colors.primary }} />
            <p style={{ color: theme.colors.text }}>上传中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-8 h-8 mb-2" style={{ color: theme.colors.primary }} />
            <p style={{ color: theme.colors.text }}>
              拖拽图片到这里，或点击选择文件
            </p>
            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
              支持 JPG、PNG、GIF 格式，单个文件不超过 5MB
            </p>
            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
              已上传 {images.length}/{maxImages} 张
            </p>
          </div>
        )}
      </div>

      {/* 图片预览 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div 
                className="aspect-square rounded-lg overflow-hidden border"
                style={{ borderColor: theme.colors.border }}
              >
                <img
                  src={imageUrl}
                  alt={`上传的图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
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
