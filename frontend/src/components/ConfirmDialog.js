import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';

/**
 * Componente de diálogo de confirmação reutilizável
 * @param {Object} props Propriedades do componente
 * @param {boolean} props.open Define se o diálogo está aberto ou fechado
 * @param {string} props.title Título do diálogo
 * @param {string} props.content Conteúdo/mensagem do diálogo
 * @param {Function} props.onConfirm Função chamada ao confirmar a ação
 * @param {Function} props.onCancel Função chamada ao cancelar a ação
 * @param {string} props.confirmText Texto do botão de confirmação
 * @param {string} props.cancelText Texto do botão de cancelamento
 * @returns {JSX.Element} Componente de diálogo
 */
const ConfirmDialog = ({ 
  open, 
  title, 
  content, 
  onConfirm, 
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar"
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {content}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="primary">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog; 