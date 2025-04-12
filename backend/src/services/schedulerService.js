const Campaign = require('../models/Campaign');
const campaignService = require('./campaignService');

class SchedulerService {
  /**
   * Inicializa o agendador
   */
  constructor() {
    this.isRunning = false;
    this.checkInterval = 30 * 1000; // Verifica a cada 30 segundos (antes era 60s)
    this.intervalId = null;
    this.lastCheck = null;
    this.nextCheck = null;
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      lastError: null
    };
  }

  /**
   * Inicia o agendador
   * @returns {Object} Status do agendador
   */
  start() {
    if (this.isRunning) {
      console.log('Agendador já está em execução');
      return this.getStatus();
    }

    console.log('Iniciando o agendador de campanhas (agendadas e recorrentes)');
    this.isRunning = true;
    
    // Define a próxima verificação
    const now = new Date();
    this.lastCheck = null;
    this.nextCheck = new Date(now.getTime() + this.checkInterval);
    
    // Executa uma vez imediatamente
    this.processScheduledCampaigns();
    
    // Configura intervalo para verificação periódica
    this.intervalId = setInterval(() => {
      this.processScheduledCampaigns();
    }, this.checkInterval);
    
    // Retorna status para log
    return this.getStatus();
  }

  /**
   * Para o agendador
   * @returns {Object} Status do agendador
   */
  stop() {
    if (!this.isRunning) {
      console.log('Agendador não está em execução');
      return this.getStatus();
    }

    console.log('Parando o agendador de campanhas');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    return this.getStatus();
  }

  /**
   * Obtém o status atual do agendador
   * @returns {Object} Status do agendador
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: this.lastCheck,
      nextCheck: this.nextCheck,
      stats: { ...this.stats }
    };
  }

  /**
   * Processa campanhas agendadas e recorrentes que estão prontas para execução
   */
  async processScheduledCampaigns() {
    try {
      const now = new Date();
      this.lastCheck = now;
      this.nextCheck = new Date(now.getTime() + this.checkInterval);
      
      console.log(`[${now.toISOString()}] Verificando campanhas agendadas e recorrentes...`);
      
      // Primeiro, processa as campanhas não recorrentes mas com data agendada
      const pendingResult = await campaignService.checkPendingScheduledCampaigns();
      
      if (pendingResult.success) {
        console.log(`Processadas ${pendingResult.total} campanhas agendadas simples: ${pendingResult.executed} executadas, ${pendingResult.failed} falhas`);
      } else {
        console.error('Erro ao processar campanhas agendadas:', pendingResult.error);
      }
      
      // Encontra campanhas recorrentes que:
      // 1. Estão em estado 'draft' ou 'scheduled'
      // 2. São recorrentes
      // 3. Têm uma próxima data de execução menor ou igual à data atual
      const campaignsToRun = await Campaign.find({
        status: { $in: ['draft', 'scheduled'] },
        isRecurring: true,
        nextRunDate: { $lte: now }
      }).populate('message').populate('contacts');
      
      console.log(`Encontradas ${campaignsToRun.length} campanhas recorrentes para executar`);
      
      let executed = 0;
      let failed = 0;
      
      // Processa cada campanha
      for (const campaign of campaignsToRun) {
        try {
          // Verifica se o momento atual está dentro do horário permitido
          const currentHour = now.getHours();
          const currentDay = now.getDay();
          
          if (
            currentHour >= campaign.allowedTimeStart && 
            currentHour <= campaign.allowedTimeEnd &&
            campaign.allowedDaysOfWeek.includes(currentDay)
          ) {
            console.log(`Executando campanha recorrente: ${campaign.name} (${campaign._id})`);
            
            // Atualiza a última data de execução
            campaign.lastRunDate = now;
            
            // Calcula a próxima data de execução
            campaign.nextRunDate = campaign.calculateNextRunDate();
            
            // Se não tiver próxima data (talvez tenha atingido a data final da recorrência),
            // desativa a recorrência para evitar execuções futuras
            if (!campaign.nextRunDate) {
              console.log(`Campanha ${campaign._id} atingiu o fim da recorrência`);
              campaign.isRecurring = false;
            }
            
            // Salva as atualizações na campanha
            await campaign.save();
            
            // Inicia a campanha
            await campaignService.startCampaign(campaign._id.toString());
            
            executed++;
            this.stats.totalExecutions++;
            this.stats.successfulExecutions++;
          } else {
            console.log(`Campanha ${campaign._id} não executada: fora do horário permitido`);
            
            // Calcula a próxima data válida considerando os horários e dias permitidos
            campaign.nextRunDate = campaign.calculateNextRunDate();
            await campaign.save();
          }
        } catch (error) {
          console.error(`Erro ao processar campanha recorrente ${campaign._id}:`, error);
          failed++;
          this.stats.failedExecutions++;
          this.stats.lastError = {
            message: error.message,
            campaignId: campaign._id.toString(),
            timestamp: new Date()
          };
        }
      }
      
      if (campaignsToRun.length > 0) {
        console.log(`Processamento concluído: ${executed} campanhas recorrentes executadas, ${failed} falhas`);
      }
      
      const totalProcessed = (pendingResult.success ? pendingResult.total : 0) + campaignsToRun.length;
      const totalExecuted = (pendingResult.success ? pendingResult.executed : 0) + executed;
      const totalFailed = (pendingResult.success ? pendingResult.failed : 0) + failed;
      
      if (totalProcessed > 0) {
        console.log(`Resumo do ciclo de agendamento: ${totalProcessed} campanhas processadas, ${totalExecuted} executadas, ${totalFailed} falhas`);
      }
      
      return {
        processed: totalProcessed,
        executed: totalExecuted,
        failed: totalFailed
      };
    } catch (error) {
      console.error('Erro ao processar campanhas agendadas:', error);
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date()
      };
      return {
        processed: 0,
        executed: 0,
        failed: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Atualiza a próxima data de execução para todas as campanhas recorrentes
   * Útil para recalcular após mudanças no sistema ou timezone
   */
  async recalculateAllNextRunDates() {
    try {
      const campaigns = await Campaign.find({
        isRecurring: true,
        status: { $in: ['draft', 'scheduled'] }
      });
      
      console.log(`Recalculando próxima execução para ${campaigns.length} campanhas recorrentes`);
      
      for (const campaign of campaigns) {
        campaign.nextRunDate = campaign.calculateNextRunDate();
        await campaign.save();
      }
      
      return {
        success: true,
        message: `Recalculadas ${campaigns.length} campanhas`,
        updatedCampaigns: campaigns.length
      };
    } catch (error) {
      console.error('Erro ao recalcular datas de execução:', error);
      throw error;
    }
  }
}

// Exporta uma única instância do serviço
module.exports = new SchedulerService(); 