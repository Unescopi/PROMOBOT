import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

/**
 * Manipulador para upload de arquivos
 * Esta rota recebe requisições de upload e processa os arquivos
 */

// Validação de tipos de arquivo por categoria
const VALID_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
};

// Modelo de mídia
const MediaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalFilename: String,
  path: { type: String, required: true },
  size: Number,
  type: { 
    type: String,
    enum: ['image', 'video', 'document', 'audio'],
    required: true 
  },
  mimeType: String,
  extension: String,
  campaignId: mongoose.Schema.Types.ObjectId,
  uploadedAt: { type: Date, default: Date.now },
  publicUrl: String,
  metadata: mongoose.Schema.Types.Mixed
});

// Registrar o modelo ou usar o existente
const Media = mongoose.models.Media || mongoose.model('Media', MediaSchema);

export async function POST(request: NextRequest) {
  try {
    // Conectar ao MongoDB
    await connectToDatabase();

    // Obter form data
    const formData = await request.formData();
    
    // Obter o arquivo do form data
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum arquivo enviado'
      }, { status: 400 });
    }
    
    // Obter metadados do formulário
    const type = formData.get('type') as string || 'image';
    const campaignId = formData.get('campaignId') as string;
    const maxSize = parseInt(formData.get('maxSize') as string || '10', 10) * 1024 * 1024; // em bytes
    
    // Validar o tipo de arquivo
    if (!VALID_MIME_TYPES[type as keyof typeof VALID_MIME_TYPES]?.includes(file.type)) {
      return NextResponse.json({
        success: false,
        message: `Tipo de arquivo inválido. Por favor, envie um arquivo ${type} válido.`
      }, { status: 400 });
    }
    
    // Validar o tamanho do arquivo
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        message: `Arquivo muito grande. O tamanho máximo é ${maxSize / (1024 * 1024)}MB.`
      }, { status: 400 });
    }
    
    // Obter array de bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Criar diretório de uploads se não existir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    // Gerar nome de arquivo único
    const fileExtension = file.name.split('.').pop() || '';
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // Salvar o arquivo
    await writeFile(filePath, buffer);
    
    // Caminho público para o arquivo
    const publicPath = `/uploads/${uniqueFilename}`;
    
    // Determinar o tipo de mídia com base no mimetype
    let mediaType: 'image' | 'video' | 'document' | 'audio' = 'document';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    
    // Salvar metadados no MongoDB
    const media = new Media({
      filename: uniqueFilename,
      originalFilename: file.name,
      path: filePath,
      size: file.size,
      type: mediaType,
      mimeType: file.type,
      extension: fileExtension,
      campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId) : undefined,
      publicUrl: publicPath,
      metadata: {
        uploadedBy: formData.get('userId') || 'anonymous',
        description: formData.get('description') || ''
      }
    });
    
    await media.save();
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicPath,
        id: media._id
      }
    });
  } catch (error) {
    console.error('Erro no upload de arquivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar upload',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return NextResponse.json({
        success: false,
        message: 'ID do arquivo não fornecido'
      }, { status: 400 });
    }
    
    // Encontrar o arquivo no banco de dados
    const media = await Media.findById(fileId);
    
    if (!media) {
      return NextResponse.json({
        success: false,
        message: 'Arquivo não encontrado'
      }, { status: 404 });
    }
    
    // Remover o arquivo do disco
    try {
      const fs = require('fs');
      if (fs.existsSync(media.path)) {
        fs.unlinkSync(media.path);
      }
    } catch (err) {
      console.error('Erro ao excluir arquivo do disco:', err);
      // Continuamos mesmo se falhar a exclusão do arquivo físico
    }
    
    // Remover o registro do banco de dados
    await Media.findByIdAndDelete(fileId);
    
    return NextResponse.json({
      success: true,
      message: 'Arquivo excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao excluir arquivo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * Manipulador para verificação da rota de upload (GET)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API de upload está disponível',
    maxSizeInMB: 15,
    supportedTypes: ['image', 'video', 'document', 'audio']
  }, { status: 200 });
} 