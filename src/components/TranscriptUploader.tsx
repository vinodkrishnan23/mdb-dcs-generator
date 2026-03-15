'use client';

import { useState } from 'react';
import { uploadTranscript } from '@/app/actions';
import { parseVTT } from '@/lib/vtt-parser';
import { Upload, File } from 'lucide-react';

interface TranscriptUploaderProps {
  accountId: string;
  userEmail: string;
  onUploadSuccess?: () => void;
}

export function TranscriptUploader({ accountId, userEmail, onUploadSuccess }: TranscriptUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const isTxt = file.name.endsWith('.txt');
        const isVtt = file.name.endsWith('.vtt');

        if (!isTxt && !isVtt) {
          console.warn(`Skipping ${file.name} - only .txt and .vtt files are supported`);
          return { success: false, fileName: file.name, error: 'Only .txt and .vtt files are supported' };
        }

        const rawText = await file.text();
        // VTT: strip timestamps/sequence numbers, convert <v Speaker> tags to "Speaker: text"
        // TXT: pass through as-is
        const text = isVtt ? parseVTT(rawText) : rawText;

        const result = await uploadTranscript(accountId, text, file.name, userEmail);
        return { ...result, fileName: file.name };
      });

      const results = await Promise.all(uploadPromises);
      
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        alert(`Failed to upload ${failed.length} file(s): ${failed.map(f => f.fileName).join(', ')}`);
      } else {
        onUploadSuccess?.();
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files');
    }
    
    setIsUploading(false);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
        dragActive
          ? 'border-green-500 bg-green-50 scale-[1.01]'
          : isUploading
          ? 'border-green-300 bg-green-50/50'
          : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".txt,.vtt"
        multiple
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
          isUploading ? 'bg-green-100' : dragActive ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className={`w-5 h-5 ${dragActive ? 'text-green-600' : 'text-gray-400'}`} />
          )}
        </div>

        <div>
          <p className={`text-sm font-semibold ${
            isUploading ? 'text-green-700' : dragActive ? 'text-green-700' : 'text-gray-700'
          }`}>
            {isUploading ? 'Uploading…' : dragActive ? 'Drop to upload' : 'Drop files here or click to browse'}
          </p>
          {!isUploading && (
            <p className="text-xs text-gray-400 mt-1">
              .txt and .vtt — VTT timestamps stripped, speaker labels preserved
            </p>
          )}
        </div>
      </div>
    </div>
  );
}