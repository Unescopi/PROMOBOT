/**
 * Serviço para gerenciamento de arquivos e uploads de mídia
 */

// Tipos de mídia suportados
export type MediaType = 'image' | 'video' | 'document' | 'audio';

// Interface para resposta de upload
interface UploadResponse {
  success: boolean;
  message: string;
  url?: string;
  filename?: string;
  filesize?: number;
  mediaType?: MediaType;
  error?: string;
}

// Interface para opções de upload
interface UploadOptions {
  maxSizeInMB?: number;
  allowedMediaTypes?: MediaType[];
  campaignId?: string;
  contactId?: string;
}

/**
 * Serviço para gerenciamento do armazenamento de arquivos
 */
export const StorageService = {
  /**
   * Realiza o upload de um arquivo para o servidor
   */
  uploadFile: async (file: File, options: UploadOptions = {}): Promise<UploadResponse> => {
    try {
      // Validar tamanho do arquivo
      const maxSize = (options.maxSizeInMB || 10) * 1024 * 1024; // Padrão: 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          message: `Arquivo excede o tamanho máximo de ${options.maxSizeInMB || 10}MB`,
          error: 'FILE_TOO_LARGE'
        };
      }

      // Determinar o tipo de mídia
      let mediaType: MediaType = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      // Validar tipo de mídia se especificado nas opções
      if (options.allowedMediaTypes && options.allowedMediaTypes.length > 0) {
        if (!options.allowedMediaTypes.includes(mediaType)) {
          return {
            success: false,
            message: `Tipo de arquivo não permitido. Tipos aceitos: ${options.allowedMediaTypes.join(', ')}`,
            error: 'INVALID_MEDIA_TYPE'
          };
        }
      }
      
      // Em uma implementação real, aqui enviaríamos o arquivo para um servidor/cloud storage
      // Por enquanto, vamos simular o upload e retornar uma URL fictícia
      
      // Criar nome de arquivo único
      const timestamp = new Date().getTime();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const filename = `${timestamp}-${randomId}.${extension}`;
      
      // Construir metadados para o arquivo
      const metadata = {
        originalName: file.name,
        size: file.size,
        type: file.type,
        mediaType,
        campaignId: options.campaignId,
        contactId: options.contactId,
        uploadedAt: new Date().toISOString()
      };
      
      // Simular tempo de upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // URL fictícia - em produção, seria a URL real do arquivo no storage
      const url = `/uploads/${mediaType}s/${filename}`;
      
      // Salvar metadados do arquivo (em um ambiente real, salvaria no banco de dados)
      console.log('Arquivo enviado com sucesso:', metadata);
      
      return {
        success: true,
        message: 'Arquivo enviado com sucesso',
        url,
        filename,
        filesize: file.size,
        mediaType
      };
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      return {
        success: false,
        message: 'Erro ao fazer upload do arquivo',
        error: 'UPLOAD_FAILED'
      };
    }
  },
  
  /**
   * Remove um arquivo do servidor
   */
  deleteFile: async (url: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Em produção, aqui removeria o arquivo do storage

      // Simular tempo de processamento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Arquivo removido:', url);
      
      return {
        success: true,
        message: 'Arquivo removido com sucesso'
      };
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      return {
        success: false,
        message: 'Erro ao remover arquivo'
      };
    }
  },
  
  /**
   * Obtém informações sobre um arquivo
   */
  getFileInfo: async (url: string): Promise<any> => {
    try {
      // Em produção, aqui buscaria metadados do arquivo no banco de dados
      
      // Simular busca de informações
      const filename = url.split('/').pop() || '';
      
      // Determinar tipo de mídia pela URL
      let mediaType: MediaType = 'document';
      if (url.includes('/images/')) mediaType = 'image';
      else if (url.includes('/videos/')) mediaType = 'video';
      else if (url.includes('/audios/')) mediaType = 'audio';
      
      return {
        success: true,
        url,
        filename,
        mediaType,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao obter informações do arquivo:', error);
      return {
        success: false,
        message: 'Erro ao obter informações do arquivo'
      };
    }
  }
}; 