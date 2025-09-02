import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, Image as ImageIcon, Zap, Palette, Camera } from 'lucide-react';

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
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
    
    // Navigate to editor with file
    navigate('/editor', { state: { file } });
  };

  const effects = [
    {
      id: 'big_head',
      name: 'Big Head Effect',
      description: 'Make heads appear larger and more prominent',
      icon: <Camera className="w-8 h-8" />,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'artistic_style',
      name: 'Artistic Style',
      description: 'Transform into beautiful artwork',
      icon: <Palette className="w-8 h-8" />,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'cartoon_effect',
      name: 'Cartoon Effect',
      description: 'Convert to cartoon-like appearance',
      icon: <Sparkles className="w-8 h-8" />,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      id: 'vintage_filter',
      name: 'Vintage Filter',
      description: 'Apply retro vintage look',
      icon: <ImageIcon className="w-8 h-8" />,
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Photo Effects Studio
              </h1>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Upload Photo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your Photos with
              <span className="block bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                AI Magic ✨
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Upload any photo and watch as our advanced AI transforms it with stunning effects. 
              From big head effects to artistic styles, create amazing visuals in seconds!
            </p>
          </div>

          {/* Quick Upload Area */}
          <div className="max-w-2xl mx-auto mb-16">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${
                dragActive 
                  ? 'border-purple-500 bg-purple-50 scale-105' 
                  : 'border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50'
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
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
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

          {/* Before/After Showcase */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-xl">
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Before</h3>
                <p className="text-gray-600">Your original photo</p>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-xl">
                <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl mb-4 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">After</h3>
                <p className="text-gray-600">AI-enhanced masterpiece</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Effects Gallery */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Effect
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore our collection of AI-powered effects designed to transform your photos into stunning works of art.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {effects.map((effect) => (
              <div key={effect.id} className="group cursor-pointer">
                <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className={`h-48 bg-gradient-to-br ${effect.gradient} flex items-center justify-center`}>
                    <div className="text-white transform group-hover:scale-110 transition-transform duration-300">
                      {effect.icon}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {effect.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {effect.description}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Photos?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already creating amazing AI-enhanced photos. 
            Upload your first image and see the magic happen!
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
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