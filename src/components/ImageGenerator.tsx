import React, { useState } from 'react';
import { Loader2, Download, Image as ImageIcon } from 'lucide-react';

interface GeneratedImage {
  success: boolean;
  image?: string;
  mimeType?: string;
  error?: string;
  textResponse?: string;
}

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data: GeneratedImage = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage?.image) return;

    const link = document.createElement('a');
    link.href = `data:${generatedImage.mimeType || 'image/png'};base64,${generatedImage.image}`;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateImage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Image Generator
        </h1>
        <p className="text-gray-600">
          Enter a prompt and let AI create amazing images for you
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Image Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe the image you want to generate... (e.g., 'A beautiful sunset over mountains with a lake in the foreground')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          <button
            onClick={generateImage}
            disabled={loading || !prompt.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {generatedImage && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {generatedImage.success && generatedImage.image ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Generated Image
                </h3>
                <button
                  onClick={downloadImage}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
              <div className="flex justify-center">
                <img
                  src={`data:${generatedImage.mimeType || 'image/png'};base64,${generatedImage.image}`}
                  alt="Generated image"
                  className="max-w-full h-auto rounded-lg shadow-md"
                  style={{ maxHeight: '600px' }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-yellow-600 mb-2">
                <strong>No Image Generated</strong>
              </div>
              <p className="text-gray-600">
                {generatedImage.error || 'The AI was unable to generate an image for this prompt.'}
              </p>
              {generatedImage.textResponse && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>AI Response:</strong> {generatedImage.textResponse}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;