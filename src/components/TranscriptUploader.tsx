'use client';

import { useState } from 'react';
import { uploadTranscript } from '@/app/actions';
import { parseVTT } from '@/lib/vtt-parser';
import { Upload, File } from 'lucide-react';

interface TranscriptUploaderProps {
  accountId: string;
  userEmail: string;
}

export function TranscriptUploader({ accountId, userEmail }: TranscriptUploaderProps) {
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
        alert(`Successfully uploaded ${results.length} file(s)`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files');
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
        accept=".txt,.vtt"
        multiple
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
            {isUploading ? 'Uploading...' : 'Upload transcript files'}
          </p>
          <p className="text-green-600">
            Drag and drop <span className="font-medium">.txt</span> or <span className="font-medium">.vtt</span> files here, or click to select
          </p>
          <p className="text-xs text-green-500 mt-1">
            VTT files are automatically parsed — timestamps stripped, speaker labels preserved
          </p>
        </div>
      </div>
    </div>
  );
}