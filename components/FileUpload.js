import { useCallback } from 'react';

const FileUpload = ({ onFileUpload, isProcessing }) => {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (isProcessing) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileUpload(files);
    }
  }, [onFileUpload, isProcessing]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (e) => {
    if (isProcessing) return;
    
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFileUpload(files);
    }
  };

  return (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        multiple
        className="hidden"
        id="file-upload"
        onChange={handleFileSelect}
        disabled={isProcessing}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="mt-4 flex text-sm text-gray-600">
          <span className="relative rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
            Upload files
          </span>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs text-gray-500">PDF, TXT, DOCX up to 10MB</p>
      </label>
    </div>
  );
};

export default FileUpload;