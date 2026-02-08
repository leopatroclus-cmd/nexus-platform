import { Router } from 'express';
import '@nexus/types';
import type { Database } from '@nexus/database';
import * as contactsSvc from './services/contacts.service.js';
import * as companiesSvc from './services/companies.service.js';
import * as dealsSvc from './services/deals.service.js';
import * as dealStagesSvc from './services/deal-stages.service.js';
import * as activitiesSvc from './services/activities.service.js';
import * as notesSvc from './services/notes.service.js';

export function createCrmRouter(db: Database): Router {
  const router = Router();

  // ─── Contacts ───
  router.get('/contacts', async (req, res, next) => {
    try {
      const result = await contactsSvc.listContacts(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 25,
        sort: req.query.sort as string,
        search: req.query.search as string,
        filter: req.query.filter as Record<string, string>,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/contacts/:id', async (req, res, next) => {
    try {
      const contact = await contactsSvc.getContactById(db, req.orgId!, req.params.id);
      if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
      res.json({ success: true, data: contact });
    } catch (e) { next(e); }
  });

  router.post('/contacts', async (req, res, next) => {
    try {
      const contact = await contactsSvc.createContact(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: contact });
    } catch (e) { next(e); }
  });

  router.put('/contacts/:id', async (req, res, next) => {
    try {
      const contact = await contactsSvc.updateContact(db, req.orgId!, req.params.id, req.body);
      if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
      res.json({ success: true, data: contact });
    } catch (e) { next(e); }
  });

  router.delete('/contacts/:id', async (req, res, next) => {
    try {
      await contactsSvc.deleteContact(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Contact deleted' });
    } catch (e) { next(e); }
  });

  // ─── Companies ───
  router.get('/companies', async (req, res, next) => {
    try {
      const result = await companiesSvc.listCompanies(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 25,
        search: req.query.search as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/companies/:id', async (req, res, next) => {
    try {
      const company = await companiesSvc.getCompanyById(db, req.orgId!, req.params.id);
      if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
      res.json({ success: true, data: company });
    } catch (e) { next(e); }
  });

  router.post('/companies', async (req, res, next) => {
    try {
      const company = await companiesSvc.createCompany(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: company });
    } catch (e) { next(e); }
  });

  router.put('/companies/:id', async (req, res, next) => {
    try {
      const company = await companiesSvc.updateCompany(db, req.orgId!, req.params.id, req.body);
      if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
      res.json({ success: true, data: company });
    } catch (e) { next(e); }
  });

  router.delete('/companies/:id', async (req, res, next) => {
    try {
      await companiesSvc.deleteCompany(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Company deleted' });
    } catch (e) { next(e); }
  });

  // ─── Deals ───
  router.get('/deals', async (req, res, next) => {
    try {
      const result = await dealsSvc.listDeals(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 25,
        stageId: req.query.stageId as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/deals/:id', async (req, res, next) => {
    try {
      const deal = await dealsSvc.getDealById(db, req.orgId!, req.params.id);
      if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
      res.json({ success: true, data: deal });
    } catch (e) { next(e); }
  });

  router.post('/deals', async (req, res, next) => {
    try {
      const deal = await dealsSvc.createDeal(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: deal });
    } catch (e) { next(e); }
  });

  router.put('/deals/:id', async (req, res, next) => {
    try {
      const deal = await dealsSvc.updateDeal(db, req.orgId!, req.params.id, req.body);
      if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
      res.json({ success: true, data: deal });
    } catch (e) { next(e); }
  });

  router.put('/deals/:id/stage', async (req, res, next) => {
    try {
      const deal = await dealsSvc.moveStage(db, req.orgId!, req.params.id, req.body.stageId);
      if (!deal) return res.status(404).json({ success: false, error: 'Deal or stage not found' });
      res.json({ success: true, data: deal });
    } catch (e) { next(e); }
  });

  router.delete('/deals/:id', async (req, res, next) => {
    try {
      await dealsSvc.deleteDeal(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Deal deleted' });
    } catch (e) { next(e); }
  });

  // ─── Deal Stages ───
  router.get('/deal-stages', async (req, res, next) => {
    try {
      const stages = await dealStagesSvc.listDealStages(db, req.orgId!);
      res.json({ success: true, data: stages });
    } catch (e) { next(e); }
  });

  router.post('/deal-stages', async (req, res, next) => {
    try {
      const stage = await dealStagesSvc.createDealStage(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: stage });
    } catch (e) { next(e); }
  });

  router.put('/deal-stages/:id', async (req, res, next) => {
    try {
      const stage = await dealStagesSvc.updateDealStage(db, req.orgId!, req.params.id, req.body);
      if (!stage) return res.status(404).json({ success: false, error: 'Stage not found' });
      res.json({ success: true, data: stage });
    } catch (e) { next(e); }
  });

  router.delete('/deal-stages/:id', async (req, res, next) => {
    try {
      await dealStagesSvc.deleteDealStage(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Stage deleted' });
    } catch (e) { next(e); }
  });

  router.post('/deal-stages/reorder', async (req, res, next) => {
    try {
      await dealStagesSvc.reorderDealStages(db, req.orgId!, req.body.stageIds);
      res.json({ success: true, message: 'Stages reordered' });
    } catch (e) { next(e); }
  });

  // ─── Activities ───
  router.get('/activities', async (req, res, next) => {
    try {
      const result = await activitiesSvc.listActivities(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 25,
        relatedType: req.query.relatedType as string,
        relatedId: req.query.relatedId as string,
        type: req.query.type as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.post('/activities', async (req, res, next) => {
    try {
      const activity = await activitiesSvc.createActivity(db, req.orgId!, req.body, req.userId);
      res.status(201).json({ success: true, data: activity });
    } catch (e) { next(e); }
  });

  router.put('/activities/:id', async (req, res, next) => {
    try {
      const activity = await activitiesSvc.updateActivity(db, req.orgId!, req.params.id, req.body);
      if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });
      res.json({ success: true, data: activity });
    } catch (e) { next(e); }
  });

  router.delete('/activities/:id', async (req, res, next) => {
    try {
      await activitiesSvc.deleteActivity(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Activity deleted' });
    } catch (e) { next(e); }
  });

  // ─── Notes ───
  router.get('/notes', async (req, res, next) => {
    try {
      const result = await notesSvc.listNotes(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 25,
        relatedType: req.query.relatedType as string,
        relatedId: req.query.relatedId as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.post('/notes', async (req, res, next) => {
    try {
      const note = await notesSvc.createNote(db, req.orgId!, req.body, req.userId);
      res.status(201).json({ success: true, data: note });
    } catch (e) { next(e); }
  });

  router.put('/notes/:id', async (req, res, next) => {
    try {
      const note = await notesSvc.updateNote(db, req.orgId!, req.params.id, req.body);
      if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
      res.json({ success: true, data: note });
    } catch (e) { next(e); }
  });

  router.delete('/notes/:id', async (req, res, next) => {
    try {
      await notesSvc.deleteNote(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Note deleted' });
    } catch (e) { next(e); }
  });

  return router;
}
