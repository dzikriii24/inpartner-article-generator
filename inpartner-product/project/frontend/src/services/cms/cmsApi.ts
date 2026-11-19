import api from '@/services/api';
import type {
  CmsBuilderStateResponse,
  CmsMediaItem,
  CmsPageTree,
  CmsPublishValidation,
  CmsRevisionItem,
  CmsSectionNode,
  CmsTemplateItem,
} from '@/types/cms/builder';

export const cmsApi = {
  // Public endpoints
  getHomepage: (lang: string, preview = false) =>
    api.get('/cms/homepage', { params: { lang, preview: preview ? 1 : 0 } }),

  getPublicSettings: () => api.get('/cms/settings'),

  subscribeNewsletter: (email: string, locale = 'id', source = 'homepage') =>
    api.post('/cms/newsletter', { email, locale, source }),

  // Admin visual builder endpoints
  getBuilderState: () => api.get<CmsBuilderStateResponse>('/admin/cms/builder'),

  saveDraft: (tree: CmsPageTree, createRevision = false, label?: string) =>
    api.put<{
      message: string;
      draft: CmsPageTree;
      draft_updated_at: string;
      has_unpublished_changes: boolean;
    }>('/admin/cms/builder/draft', {
      tree,
      create_revision: createRevision,
      label,
    }),

  validateDraft: (tree?: CmsPageTree) =>
    api.post<CmsPublishValidation>('/admin/cms/builder/validate', tree ? { tree } : {}),

  publish: (tree?: CmsPageTree, label?: string) =>
    api.post<{
      message: string;
      version: number;
      published_at: string;
      validation: CmsPublishValidation;
      published: CmsPageTree;
      has_unpublished_changes: boolean;
    }>('/admin/cms/builder/publish', { tree, label }),

  resetDraft: (mode: 'published' | 'factory') =>
    api.post<{
      message: string;
      draft: CmsPageTree;
      has_unpublished_changes: boolean;
    }>('/admin/cms/builder/reset', { mode }),

  getRevisions: () => api.get<{ data: CmsRevisionItem[] }>('/admin/cms/builder/revisions'),

  restoreRevision: (id: number) =>
    api.post<{
      message: string;
      draft: CmsPageTree;
      has_unpublished_changes: boolean;
    }>(`/admin/cms/builder/revisions/${id}/restore`),

  // Templates
  getTemplates: () => api.get<{ data: CmsTemplateItem[] }>('/admin/cms/templates'),

  saveTemplate: (payload: {
    name: string;
    category: string;
    description?: string;
    section_data: Partial<CmsSectionNode>;
  }) => api.post<{ message: string; template: CmsTemplateItem }>('/admin/cms/templates', payload),

  deleteTemplate: (id: number) => api.delete(`/admin/cms/templates/${id}`),

  // Media library
  getMedia: (params?: { q?: string; folder?: string }) =>
    api.get<{ data: CmsMediaItem[] }>('/admin/cms/media', { params }),

  uploadMedia: (file: File, meta?: { alt_text?: string; caption?: string; folder?: string }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (meta?.alt_text) fd.append('alt_text', meta.alt_text);
    if (meta?.caption) fd.append('caption', meta.caption);
    if (meta?.folder) fd.append('folder', meta.folder);
    return api.post<{ message: string; media: CmsMediaItem }>('/admin/cms/media', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateMedia: (id: number, data: { alt_text?: string; caption?: string; folder?: string }) =>
    api.patch<{ message: string; media: CmsMediaItem }>(`/admin/cms/media/${id}`, data),

  deleteMedia: (id: number, force = false) =>
    api.delete(`/admin/cms/media/${id}`, { params: force ? { force: 1 } : {} }),
};

