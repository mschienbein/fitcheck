"use client";

import React, { useState, useCallback } from 'react';
import { Upload, Camera, Link, Loader2, AlertCircle, Check, Sparkles, Image, Wand2 } from 'lucide-react';
import ImageCropper from './ImageCropper';

interface VirtualTryOnProps {
  userId?: string;
}

export default function VirtualTryOn({ userId }: VirtualTryOnProps) {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [clothingUrl, setClothingUrl] = useState('');
  const [showCropper, setShowCropper] = useState<'user' | 'clothing' | null>(null);
  const [backgroundPref, setBackgroundPref] = useState('neutral');

  const handleImageUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'user' | 'clothing'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      if (type === 'user') {
        setUserImage(imageUrl);
      } else {
        setClothingImage(imageUrl);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImportFromUrl = async () => {
    if (!clothingUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/clothing/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clothingUrl })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import from URL');
      }
      
      setClothingImage(data.item.imageUrl);
      setClothingUrl('');
      setActiveTab('upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import clothing');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTryOn = async () => {
    if (!userImage || !clothingImage) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert base64 to blob
      const userBlob = await fetch(userImage).then(r => r.blob());
      const clothingBlob = await fetch(clothingImage).then(r => r.blob());
      
      const formData = new FormData();
      formData.append('userImage', userBlob, 'user.jpg');
      formData.append('clothingImage', clothingBlob, 'clothing.jpg');
      formData.append('backgroundPreference', backgroundPref);
      
      const response = await fetch('/api/tryon', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate try-on');
      }
      
      setResultImage(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate try-on');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrop = (croppedImage: string, type: 'user' | 'clothing') => {
    if (type === 'user') {
      setUserImage(croppedImage);
    } else {
      setClothingImage(croppedImage);
    }
    setShowCropper(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-purple-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-purple-500/10 rounded-2xl mb-4">
            <Sparkles className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Virtual Try-On Studio
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Upload your photo and a clothing item to see how it looks on you using AI
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Image Upload */}
          <div className="glass rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-400" />
                Your Photo
              </h2>
              {userImage && (
                <button
                  onClick={() => setShowCropper('user')}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              {userImage ? (
                <div className="relative group">
                  <img
                    src={userImage}
                    alt="User"
                    className="w-full h-64 object-cover rounded-lg shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => setUserImage(null)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'user')}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/50 rounded-xl p-8 cursor-pointer transition-colors bg-purple-500/5 hover:bg-purple-500/10">
                    <Upload className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                    <p className="text-center text-gray-400">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-center text-gray-500 text-sm mt-2">
                      JPG, PNG up to 10MB
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Clothing Image Upload */}
          <div className="glass rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-400" />
                Clothing Item
              </h2>
              {clothingImage && (
                <button
                  onClick={() => setShowCropper('clothing')}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                  activeTab === 'upload'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                  activeTab === 'url'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Link className="w-4 h-4 inline mr-2" />
                URL
              </button>
            </div>

            {clothingImage ? (
              <div className="relative group">
                <img
                  src={clothingImage}
                  alt="Clothing"
                  className="w-full h-64 object-cover rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => setClothingImage(null)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'upload' ? (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'clothing')}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/50 rounded-xl p-8 cursor-pointer transition-colors bg-purple-500/5 hover:bg-purple-500/10">
                      <Upload className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                      <p className="text-center text-gray-400">
                        Click to upload clothing
                      </p>
                      <p className="text-center text-gray-500 text-sm mt-2">
                        JPG, PNG up to 10MB
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={clothingUrl}
                      onChange={(e) => setClothingUrl(e.target.value)}
                      placeholder="https://example.com/shirt.jpg"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleImportFromUrl}
                      disabled={!clothingUrl || isLoading}
                      className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                      Import from URL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Result/Controls */}
          <div className="glass rounded-2xl p-6 border border-purple-500/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              Result
            </h2>

            {!resultImage && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Background Style
                  </label>
                  <select
                    value={backgroundPref}
                    onChange={(e) => setBackgroundPref(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="neutral">Neutral Studio</option>
                    <option value="outdoor">Outdoor Scene</option>
                    <option value="urban">Urban Street</option>
                    <option value="fashion">Fashion Runway</option>
                    <option value="preserve">Keep Original</option>
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {resultImage ? (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={resultImage}
                    alt="Virtual Try-On Result"
                    className="w-full h-64 object-cover rounded-lg shadow-lg"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Generated
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setResultImage(null)}
                    className="py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                  <a
                    href={resultImage}
                    download="virtual-tryon-result.jpg"
                    className="py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-center"
                  >
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={generateTryOn}
                  disabled={!userImage || !clothingImage || isLoading}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg transition-all transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-2 font-medium btn-hover"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Try-On
                    </>
                  )}
                </button>
                {isLoading && (
                  <p className="text-center text-gray-400 text-sm mt-4">
                    This may take 10-15 seconds...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Cropper Modal */}
        {showCropper && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <ImageCropper
                image={showCropper === 'user' ? userImage! : clothingImage!}
                onCrop={(cropped) => handleCrop(cropped, showCropper)}
                onCancel={() => setShowCropper(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}