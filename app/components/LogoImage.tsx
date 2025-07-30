'use client';
import React, { useState } from 'react';
import Image from 'next/image';

interface LogoImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  showWatermark?: boolean;
  sizes?: string;
}

export default function LogoImage({ 
  src, 
  alt, 
  width, 
  height, 
  fill, 
  className = '', 
  priority = false,
  showWatermark = false,
  sizes
}: LogoImageProps) {
  const [useNextImage, setUseNextImage] = useState(true);
  const [imgSrc, setImgSrc] = useState(src);

  const handleError = () => {
    console.warn(`Failed to load image with Next.js Image: ${src}`);
    if (useNextImage) {
      // Переключаемся на обычный img тег
      setUseNextImage(false);
    } else {
      // Используем плейсхолдер
      setImgSrc('/placeholder-logo.svg');
    }
  };

  return (
    <div className="relative w-full h-full">
      {useNextImage ? (
        <Image
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          className={className}
          priority={priority}
          sizes={sizes}
          onError={handleError}
          unoptimized={imgSrc.startsWith('/generated-logos/')} // Отключаем оптимизацию для локальных файлов
        />
      ) : (
        <img
          src={imgSrc}
          alt={alt}
          className={className}
          onError={handleError}
          style={fill ? { 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain' 
          } : { 
            width: width, 
            height: height 
          }}
        />
      )}
      
      {/* Водяной знак */}
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-gray-400 text-xl font-bold opacity-50 rotate-[-30deg] select-none" style={{ fontSize: '3rem' }}>
            PIXORA
          </div>
        </div>
      )}
    </div>
  );
}