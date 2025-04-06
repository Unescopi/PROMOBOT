import { NextRequest, NextResponse } from 'next/server';
import StatisticsService from '@/services/statisticsService';

/**
 * Rota para obter estatísticas gerais do sistema
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');
    
    // Se um ID de campanha foi fornecido, retornar estatísticas específicas
    if (campaignId) {
      const stats = await StatisticsService.getCampaignStatistics(campaignId);
      return NextResponse.json({
        success: true,
        data: stats
      });
    }
    
    // Caso contrário, retornar estatísticas globais
    const globalStats = await StatisticsService.getGlobalStatistics();
    // Também obter dados para gráficos
    const messagesPerDay = await StatisticsService.getMessagesPerDayChart(7);
    const statusDistribution = await StatisticsService.getMessageStatusDistribution();
    
    return NextResponse.json({
      success: true,
      data: {
        stats: globalStats,
        charts: {
          messagesPerDay,
          statusDistribution
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar estatísticas'
    }, { status: 500 });
  }
}

/**
 * Rota para exportar estatísticas para CSV
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { campaignId, dateRange } = data;
    
    // URL para download (em implementação real, seria gerado um arquivo CSV)
    const downloadUrl = await StatisticsService.exportStatisticsToCSV(campaignId);
    
    return NextResponse.json({
      success: true,
      data: {
        downloadUrl
      }
    });
  } catch (error) {
    console.error('Erro ao exportar estatísticas:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao exportar estatísticas'
    }, { status: 500 });
  }
} 