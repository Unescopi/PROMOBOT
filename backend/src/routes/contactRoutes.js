const express = require('express');
const router = express.Router();
const multer = require('multer');
const contactController = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  contactValidator, 
  contactIdValidator, 
  contactQueryValidator 
} = require('../validators/contactValidator');

// Configuração do multer para upload de arquivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

// Rotas para contatos
router.post('/', protect, contactValidator, validate, contactController.createContact);
router.get('/', protect, contactQueryValidator, validate, contactController.getContacts);
router.get('/:id', protect, contactIdValidator, validate, contactController.getContactById);
router.put('/:id', protect, contactIdValidator, contactValidator, validate, contactController.updateContact);
router.delete('/:id', protect, contactIdValidator, validate, contactController.deleteContact);

// Rota para importação de contatos via CSV
router.post('/import/csv', protect, upload.single('file'), contactController.importContactsFromCSV);

module.exports = router; 