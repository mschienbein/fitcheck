"use client";

import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageUrl: string) => void;
  aspectRatio?: number;
}

export default function ImageCropper({ 
  imageSrc, 
  onCropComplete, 
  aspectRatio 
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const getCroppedImg = async () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCropComplete(croppedImageUrl);
  };

  return (
    <div className="space-y-4 text-foreground">
      <ReactCrop
        crop={crop}
        onChange={c => setCrop(c)}
        onComplete={c => setCompletedCrop(c)}
        aspect={aspectRatio}
        className="max-h-[500px]"
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop this image"
          className="max-w-full h-auto"
        />
      </ReactCrop>
      
      <button
        onClick={getCroppedImg}
        disabled={!completedCrop?.width || !completedCrop?.height}
        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg disabled:from-gray-700 disabled:to-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
      >
        Apply Crop
      </button>
    </div>
  );
}