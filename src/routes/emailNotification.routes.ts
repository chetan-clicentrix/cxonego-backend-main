import { Router } from 'express';
import { EmailNotificationController } from '../controllers/emailNotification.controller';

const router = Router();
const controller = new EmailNotificationController();

// Email Sending Routes
router.post('/send', (req, res) => controller.sendEmail(req, res));
router.post('/send-template', (req, res) => controller.sendTemplateEmail(req, res));
router.post('/send-document-link', (req, res) => controller.sendDocumentLinkEmail(req, res));

// Email History Routes
router.get('/sent', (req, res) => controller.getSentEmails(req, res));
router.get('/sent/:sentEmailId', (req, res) => controller.getSentEmailById(req, res));

// Template Management Routes
router.get('/templates', (req, res) => controller.getTemplates(req, res));
router.get('/templates/:templateId', (req, res) => controller.getTemplateById(req, res));
router.post('/templates', (req, res) => controller.createTemplate(req, res));
router.put('/templates/:templateId', (req, res) => controller.updateTemplate(req, res));
router.delete('/templates/:templateId', (req, res) => controller.deleteTemplate(req, res));
router.post('/templates/:templateId/preview', (req, res) => controller.previewTemplate(req, res));

export default router;
