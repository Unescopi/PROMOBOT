"use client";

import React, { useState, useRef } from 'react';
import { HiOutlinePhotograph, HiOutlineVideoCamera, HiOutlineDocumentText, HiX, HiUpload } from 'react-icons/hi';
import Image from 'next/image';
import axios from 'axios';

interface MediaUploaderProps {
  onUploadComplete: (url: string, type: string) => void;
  mediaUrl?: string;
  type: 'imagem' | 'video' | 'documento';
}

const MediaUploaderSimple: React.FC<MediaUploaderProps> = ({
  onUploadComplete,
  mediaUrl,
  type
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(mediaUrl || '');
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const maxSize = 10; // 10MB
  
  // Mapeamento do tipo para o tipo de mídia
  const getMediaType = (): 'image' | 'video' | 'document' => {
    switch(type) {
      case 'imagem': return 'image';
      case 'video': return 'video';
      case 'documento': return 'document';
      default: return 'image';
    }
  };
  
  const mediaType = getMediaType();
  
  // Mapeamento do tipo para os formatos de arquivo aceitos
  const getAcceptString = (): string => {
    switch(type) {
      case 'imagem': return 'image/*';
      case 'video': return 'video/*';
      case 'documento': return '.pdf,.doc,.docx,.txt,.xls,.xlsx';
      default: return '*/*';
    }
  };
  
  const accept = getAcceptString();

  // Se já existe uma mídia
  React.useEffect(() => {
    if (mediaUrl) {
      setPreview(mediaUrl);
    }
  }, [mediaUrl]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setPreview('');
    setError('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = (file: File): boolean => {
    // Verificar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Arquivo muito grande. O tamanho máximo é ${maxSize}MB.`);
      return false;
    }

    // Verificar tipo baseado no mediaType
    if (mediaType === 'image' && !file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido.');
      return false;
    } else if (mediaType === 'video' && !file.type.startsWith('video/')) {
      setError('Por favor, selecione um arquivo de vídeo válido.');
      return false;
    } else if (mediaType === 'document' && 
      !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type)) {
      setError('Por favor, selecione um documento válido (PDF, DOC, DOCX, TXT, XLS, XLSX).');
      return false;
    }

    return true;
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (mediaType === 'image') {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else if (mediaType === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg'));
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      } else {
        // Para documentos, usamos um ícone padrão
        if (file.type.includes('pdf')) {
          resolve('/icons/pdf-icon.png');
        } else if (file.type.includes('word') || file.type.includes('document')) {
          resolve('/icons/doc-icon.png');
        } else if (file.type.includes('excel') || file.type.includes('sheet')) {
          resolve('/icons/excel-icon.png');
        } else {
          resolve('/icons/file-icon.png');
        }
      }
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    setUploading(true);
    setProgress(0);

    try {
      // Criar FormData para envio
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', mediaType);
      formData.append('maxSize', maxSize.toString());
      
      // Enviar para a API de upload
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setProgress(percentCompleted);
        },
      });

      // Verificar resposta
      if (response.data.success) {
        setProgress(100);
        
        // Timeout para mostrar 100% completo por um momento
        await new Promise(resolve => setTimeout(resolve, 500));
        setUploading(false);
        
        return response.data.file.url;
      } else {
        throw new Error(response.data.message || 'Erro ao fazer upload');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setError('Falha ao fazer upload do arquivo. Tente novamente.');
      setUploading(false);
      throw error;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      await processFile(droppedFile);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setError('');
    
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      const previewUrl = await createPreview(selectedFile);
      setPreview(previewUrl);
      
      try {
        const uploadedUrl = await uploadFile(selectedFile);
        onUploadComplete(uploadedUrl, selectedFile.type);
      } catch (error) {
        resetUploader();
      }
    }
  };

  const handleRemove = () => {
    resetUploader();
    onUploadComplete('', '');
  };

  const getMediaIcon = () => {
    switch (mediaType) {
      case 'image':
        return <HiOutlinePhotograph className="w-10 h-10 text-gray-400" />;
      case 'video':
        return <HiOutlineVideoCamera className="w-10 h-10 text-gray-400" />;
      case 'document':
        return <HiOutlineDocumentText className="w-10 h-10 text-gray-400" />;
    }
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : error 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 hover:border-gray-400'
          } transition-colors cursor-pointer`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {getMediaIcon()}
          <p className="mt-2 text-sm text-gray-600">
            {mediaType === 'image' && 'Arraste e solte uma imagem ou clique para selecionar'}
            {mediaType === 'video' && 'Arraste e solte um vídeo ou clique para selecionar'}
            {mediaType === 'document' && 'Arraste e solte um documento ou clique para selecionar'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Tamanho máximo: {maxSize}MB
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 relative">
          {uploading ? (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-10">
              <div className="w-full max-w-xs">
                <div className="bg-gray-200 rounded-full h-2.5 w-full mb-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center text-gray-600">Enviando... {progress}%</p>
              </div>
            </div>
          ) : null}
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-24 h-24 relative overflow-hidden rounded border">
              {mediaType === 'image' && (
                <div className="w-full h-full relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="object-contain w-full h-full"
                  />
                </div>
              )}
              
              {mediaType === 'video' && (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  {preview.startsWith('data:') ? (
                    <img src={preview} alt="Video thumbnail" className="object-contain w-full h-full" />
                  ) : (
                    <HiOutlineVideoCamera className="w-10 h-10 text-white" />
                  )}
                </div>
              )}
              
              {mediaType === 'document' && (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <HiOutlineDocumentText className="w-10 h-10 text-gray-500" />
                </div>
              )}
            </div>
            
            <div className="ml-4 flex-1">
              <p className="font-medium text-sm truncate">
                {file?.name || 'Arquivo carregado'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {file?.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : ''}
              </p>
              <button
                type="button"
                onClick={handleRemove}
                className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <HiX className="mr-1" /> Remover
              </button>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default MediaUploaderSimple; 