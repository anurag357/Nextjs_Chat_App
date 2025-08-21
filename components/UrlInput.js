import { useState } from 'react';

const UrlInput = ({ onUrlSubmit, isProcessing }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isProcessing) {
      onUrlSubmit(url);
      setUrl('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/docs"
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        disabled={isProcessing}
      />
      <button
        type="submit"
        className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={!url.trim() || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Add URL'}
      </button>
    </form>
  );
};

export default UrlInput;