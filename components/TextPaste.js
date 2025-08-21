import { useState } from 'react';

const TextPaste = ({ onTextSubmit, isProcessing }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isProcessing) {
      onTextSubmit(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your text here..."
        className="w-full h-32 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        disabled={isProcessing}
      />
      <button
        type="submit"
        className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={!text.trim() || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Add Text Content'}
      </button>
    </form>
  );
};

export default TextPaste;