# Sons de Notificação

Este diretório contém os arquivos de som usados para notificações no PROMOBOT.

## Arquivos Necessários

1. `success.mp3` - Som para notificações de sucesso (ex: mensagem enviada, campanha iniciada)
2. `error.mp3` - Som para notificações de erro (ex: falha no envio, erro do sistema)
3. `warning.mp3` - Som para notificações de alerta (ex: limite de mensagens próximo)
4. `info.mp3` - Som para notificações informativas (ex: nova mensagem recebida)
5. `message.mp3` - Som para novas mensagens

## Alternativas

Também são fornecidas variações alternativas para alguns sons:

1. `success-2.mp3` - Som alternativo de sucesso
2. `success-3.mp3` - Som alternativo de sucesso
3. `error-2.mp3` - Som alternativo de erro
4. `error-3.mp3` - Som alternativo de erro

## Formato

- Todos os arquivos devem estar no formato MP3
- Duração recomendada: 0.5 a 2 segundos
- Tamanho máximo por arquivo: 100KB

## Observações

- Os sons devem ser sutis e profissionais
- Evitar sons muito longos ou irritantes
- Testar o volume para garantir que não seja muito alto

## Como Adicionar Novos Sons

1. Adicione o arquivo MP3 neste diretório
2. Atualize o arquivo de configuração em `src/config/sounds.js`
3. Adicione a opção no seletor de sons nas configurações 