'use client';

import { useState } from 'react';
import { uploadTranscript } from '@/app/actions';
import { Upload, File } from 'lucide-react';

interface TranscriptUploaderProps {
  accountId: string;
}

export function TranscriptUploader({ accountId }: TranscriptUploaderProps) {
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
    const file = files[0];
    
    if (!file.name.endsWith('.txt')) {
      alert('Please upload a .txt file');
      return;
    }

    setIsUploading(true);
    
    try {
      const text = await file.text();
      const result = await uploadTranscript(accountId, text, file.name);
      
      if (!result.success) {
        alert('Failed to upload transcript');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }
    
    setIsUploading(false);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragActive 
          ? 'border-green-400 bg-green-50' 
          : 'border-green-300 hover:border-green-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".txt"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />
      
      <div className="space-y-4">
        <div className="mx-auto w-12 h-12 text-green-500">
          {isUploading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          ) : (
            <Upload className="w-12 h-12" />
          )}
        </div>
        
        <div>
          <p className="text-lg font-medium text-green-800">
            {isUploading ? 'Uploading...' : 'Upload transcript file'}
          </p>
          <p className="text-green-600">
            Drag and drop a .txt file here, or click to select
          </p>
        </div>
      </div>
    </div>
  );
}