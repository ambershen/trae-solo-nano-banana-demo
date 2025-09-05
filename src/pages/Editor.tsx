import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Download, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Camera,
  Palette,
  Sparkles,
  Image as ImageIcon,
  Zap,
  Box
} from 'lucide-react';

interface ProcessingJob {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  result_url?: string;
  error?: string;
}

interface Effect {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

export default function Editor() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(location.state?.file || null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedEffect, setSelectedEffect] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const effects: Effect[] = [
    {
      id: 'anime_style',
      name: 'Anime Style',
      description: 'Transform into anime character',
      icon: <Sparkles className="w-6 h-6" />,
      gradient: 'from-gray-800 to-black'
    },
    {
      id: 'picasso_style',
      name: 'Picasso Style',
      description: 'Cubist artistic transformation',
      icon: <Palette className="w-6 h-6" />,
      gradient: 'from-gray-700 to-gray-900'
    },
    {
      id: 'oil_painting',
      name: 'Oil Painting Style',
      description: 'Transform into a classic oil painting',
      icon: <Palette className="w-6 h-6" />,
      gradient: 'from-gray-500 to-gray-700'
    },
    {
      id: 'frida_effect',
      name: 'Frida Style',
      description: 'Transform into Frida Kahlo painting style',
      icon: <Palette className="w-6 h-6" />,
      gradient: 'from-gray-400 to-gray-600'
    },
    {
      id: 'miniature_effect',
      name: 'Miniature Effect',
      description: 'Transform into a collectible figure',
      icon: <Box className="w-6 h-6" />,
      gradient: 'from-gray-300 to-gray-500'
    }
  ];

  // Create preview URL when file is selected
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  // Poll for processing status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (processingJob && processingJob.status === 'processing') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/images/status/${processingJob.id}`);
          const data = await response.json();
          
          setProcessingJob(prev => ({ ...prev, ...data }));
          
          if (data.status === 'completed') {
            setProcessedImageUrl(data.resultUrl);
            setIsProcessing(false);
          } else if (data.status === 'failed') {
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processingJob]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    setProcessedImageUrl('');
    setProcessingJob(null);
  };

  const handleApplyEffect = async () => {
    console.log('handleApplyEffect called');
    console.log('selectedFile:', selectedFile);
    console.log('selectedEffect:', selectedEffect);
    
    if (!selectedFile || !selectedEffect) {
      alert('Please select an image and an effect');
      return;
    }

    setIsProcessing(true);
    setProcessedImageUrl('');
    setProcessingJob(null);

    try {
      // Step 1: Upload the image first
      console.log('Starting image upload...');
      const uploadFormData = new FormData();
      uploadFormData.append('image', selectedFile);

      const uploadResponse = await fetch('/api/images/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      console.log('Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error('Failed to upload image');
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload successful:', uploadData);
      const imageId = uploadData.imageId;

      // Step 2: Apply the effect using the imageId
      console.log('Starting effect application with imageId:', imageId);
      const effectResponse = await fetch('/api/images/apply-effect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: imageId,
          effectType: selectedEffect,
          intensity: 0.8
        }),
      });

      if (!effectResponse.ok) {
        throw new Error('Failed to apply effect');
      }

      const effectData = await effectResponse.json();
      setProcessingJob({
        id: effectData.jobId,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error applying effect:', error);
      alert('Failed to apply effect. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedImageUrl) {
      const link = document.createElement('a');
      link.href = processedImageUrl;
      link.download = `processed-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-black via-gray-400 to-amber-100 bg-clip-text text-transparent">Photo Editor</h1>
              </div>
            </div>
            {processedImageUrl && (
              <button
                onClick={handleDownload}
                className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Image Upload and Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            {!selectedFile && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Your Photo</h2>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
                    dragActive 
                      ? 'border-black bg-gray-100 scale-105' 
                      : 'border-gray-400 bg-gray-50 hover:border-gray-600 hover:bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  
                  <div className="text-center cursor-pointer">
                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Drop your photo here
                    </h3>
                    <p className="text-gray-600 mb-4">
                      or click to browse your files
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <ImageIcon className="w-4 h-4 mr-1" />
                        JPEG, PNG, WebP
                      </span>
                      <span>•</span>
                      <span>Max 10MB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Image Preview */}
            {selectedFile && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Preview</h2>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-black hover:text-gray-700 font-medium flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Change Image</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Original Image */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700">Original</h3>
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Original"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Processed Image */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700">Processed</h3>
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                      {isProcessing ? (
                        <div className="text-center">
                          <Loader2 className="w-12 h-12 text-black animate-spin mx-auto mb-4" />
                          <p className="text-gray-600">Processing...</p>
                          {processingJob?.progress && (
                            <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                              <div 
                                className="bg-black h-2 rounded-full transition-all duration-300"
                                style={{ width: `${processingJob.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      ) : processedImageUrl ? (
                        <img
                          src={processedImageUrl}
                          alt="Processed"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                          <p>Select an effect to preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Effects Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Effect</h2>
              
              <div className="space-y-4">
                {effects.map((effect) => (
                  <div
                    key={effect.id}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedEffect === effect.id
                        ? 'border-black bg-gray-100'
                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedEffect(effect.id)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${effect.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                        {effect.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {effect.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {effect.description}
                        </p>
                      </div>
                      {selectedEffect === effect.id && (
                        <CheckCircle className="w-5 h-5 text-black flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleApplyEffect}
                disabled={!selectedFile || !selectedEffect || isProcessing}
                className="w-full mt-6 bg-black text-white py-3 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Apply Effect</span>
                  </>
                )}
              </button>
            </div>

            {/* Processing Status */}
            {processingJob && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Status</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {processingJob.status === 'processing' && (
                      <>
                        <Loader2 className="w-5 h-5 text-black animate-spin" />
                        <span className="text-black font-medium">Processing...</span>
                      </>
                    )}
                    {processingJob.status === 'completed' && (
                      <>
                        <CheckCircle className="w-5 h-5 text-gray-800" />
                        <span className="text-gray-800 font-medium">Completed!</span>
                      </>
                    )}
                    {processingJob.status === 'failed' && (
                      <>
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-600 font-medium">Failed</span>
                      </>
                    )}
                  </div>
                  
                  {processingJob.error && (
                    <p className="text-sm text-gray-700 bg-gray-100 p-3 rounded-lg border border-gray-300">
                      {processingJob.error}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">
              AI Photo Effects Studio
            </h3>
          </div>
          <p className="text-gray-400 mb-6">
            Transform your photos with the power of artificial intelligence.
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <span>Powered by Gemini 2.5 Flash</span>
            <span>•</span>
            <span>Built with React & TypeScript</span>
            <span>•</span>
            <span>Made with ❤️</span>
          </div>
        </div>
      </footer>
    </div>
  );
}