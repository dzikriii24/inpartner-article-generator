export type CmsLocale = 'id' | 'en' | 'ko';
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type SectionType =
  | 'hero'
  | 'featured_products'
  | 'latest_products'
  | 'product_carousel'
  | 'categories'
  | 'why_us'
  | 'about'
  | 'cta'
  | 'newsletter'
  | 'promo_banner'
  | 'testimonials'
  | 'faq'
  | 'statistics'
  | 'image_gallery'
  | 'split_content'
  | 'custom_layout';

export type BlockType =
  | 'heading'
  | 'text_block'
  | 'button'
  | 'image'
  | 'image_gallery'
  | 'badge'
  | 'spacer'
  | 'divider'
  | 'stats_row'
  | 'feature_list'
  | 'faq_list'
  | 'testimonial_list'
  | 'product_grid'
  | 'safe_embed';

export interface ResponsiveBreakpointConfig {
  visible?: boolean;
  columns?: number;
  padding_y?: 'none' | 'sm' | 'md' | 'lg';
  text_align?: 'left' | 'center' | 'right';
  font_scale?: 'sm' | 'md' | 'lg';
}

export interface CmsResponsiveConfig {
  desktop?: ResponsiveBreakpointConfig;
  tablet?: ResponsiveBreakpointConfig;
  mobile?: ResponsiveBreakpointConfig;
}

export interface CmsStyles {
  background_color?: string;
  background_image?: string;
  text_color?: string;
  padding_y?: 'none' | 'sm' | 'normal' | 'lg';
  padding_x?: 'none' | 'sm' | 'normal' | 'lg';
  margin_y?: 'none' | 'sm' | 'normal' | 'lg';
  border_radius?: string;
  border_color?: string;
  shadow?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  text_align?: 'left' | 'center' | 'right';
  container_width?: 'narrow' | 'default' | 'wide' | 'full';
  font_size?: string;
  font_weight?: string;
  width?: string;
  height?: string;
  gap?: string;
}

export interface CmsBlockNode {
  id: string;
  type: BlockType;
  label: string;
  visible: boolean;
  locked?: boolean;
  props: Record<string, any>;
  styles?: CmsStyles;
  responsive?: CmsResponsiveConfig;
  advanced?: {
    element_id?: string;
    css_class?: string;
  };
  translations?: {
    en?: Record<string, any>;
    ko?: Record<string, any>;
  };
}

export interface CmsSectionTranslation {
  title?: string;
  subtitle?: string;
  content?: Record<string, any>;
}

export interface CmsSectionNode {
  id: string;
  key: string;
  type: SectionType;
  label: string;
  visible: boolean;
  is_active?: boolean;
  locked?: boolean;
  order: number;
  sort_order?: number;
  title: string;
  subtitle?: string;
  content: Record<string, any>;
  settings: Record<string, any>;
  styles: CmsStyles;
  responsive: CmsResponsiveConfig;
  advanced?: {
    element_id?: string;
    css_class?: string;
  };
  translations?: {
    en?: CmsSectionTranslation;
    ko?: CmsSectionTranslation;
  };
  children?: CmsBlockNode[];
}

export interface HeaderNavChild {
  id: string;
  label: string;
  description?: string;
  url: string;
  icon?: string;
}

export interface HeaderNavItem {
  id: string;
  label: string;
  url: string;
  type: 'link' | 'dropdown';
  icon?: string;
  children?: HeaderNavChild[];
}

export interface CmsHeaderConfig {
  brand_name: string;
  tagline: string;
  logo_url: string;
  sticky: boolean;
  background_color: string;
  blur: boolean;
  show_search: boolean;
  search_placeholder: string;
  show_language_switcher: boolean;
  show_wishlist: boolean;
  show_cart: boolean;
  login_label: string;
  register_label: string;
  nav_items: HeaderNavItem[];
}

export interface FooterLinkItem {
  id: string;
  label: string;
  url: string;
}

export interface FooterLinkGroup {
  id: string;
  title: string;
  links: FooterLinkItem[];
}

export interface CmsFooterConfig {
  brand_name: string;
  logo_url: string;
  description: string;
  background_color: string;
  text_color: string;
  heading_color: string;
  contact_email: string;
  contact_phone: string;
  office_address: string;
  social_linkedin: string;
  social_twitter: string;
  social_instagram: string;
  show_contact: boolean;
  show_socials: boolean;
  show_newsletter: boolean;
  newsletter_title: string;
  newsletter_placeholder: string;
  newsletter_button: string;
  link_groups: FooterLinkGroup[];
  show_payment_block: boolean;
  payment_title: string;
  payment_desc: string;
  payment_badges: string[];
  copyright: string;
  standard_text: string;
  legal_links: FooterLinkItem[];
}

export interface CmsThemeConfig {
  colors: {
    primary: string;
    primary_hover: string;
    primary_pressed: string;
    primary_surface: string;
    primary_border: string;
    secondary: string;
    accent: string;
    canvas: string;
    surface: string;
    text_heading: string;
    text_body: string;
    text_muted: string;
    border: string;
  };
  typography: {
    font_primary: string;
    font_supporting: string;
    heading_scale: 'compact' | 'balanced' | 'editorial';
    body_size: number;
    line_height: number;
    heading_weight: string;
    letter_spacing: string;
  };
  layout: {
    container_width: 'max-w-6xl' | 'max-w-7xl' | 'max-w-[1400px]';
    section_spacing: 'compact' | 'normal' | 'spacious';
    grid_gap: string;
    border_radius: 'sharp' | 'rounded' | 'pill';
    button_style: 'solid' | 'soft' | 'outline';
  };
}

export interface CmsSeoConfig {
  meta_title: string;
  meta_description: string;
}

export interface CmsPageTree {
  page: string;
  schema_version: number;
  sections: CmsSectionNode[];
  header: CmsHeaderConfig;
  footer: CmsFooterConfig;
  theme: CmsThemeConfig;
  seo: CmsSeoConfig;
}

export type SelectionTarget =
  | { scope: 'section'; sectionId: string; subPart?: string }
  | { scope: 'block'; sectionId: string; blockId: string }
  | { scope: 'header'; subPart?: string }
  | { scope: 'footer'; subPart?: string }
  | { scope: 'theme' };

export interface CmsRevisionItem {
  id: number;
  version: number;
  status: 'draft' | 'published' | 'autosave' | 'restore_point';
  label: string | null;
  created_by_name: string | null;
  sections_count: number;
  created_at: string;
}

export interface CmsTemplateItem {
  id: number;
  uid: string;
  name: string;
  category: string;
  description: string | null;
  thumbnail_type: string | null;
  section_data: Partial<CmsSectionNode>;
  is_system: boolean;
  created_at?: string;
}

export interface CmsMediaItem {
  id: number;
  uid: string;
  file_name: string;
  original_name: string;
  url: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  folder: string;
  created_at?: string;
}

export interface CmsPublishValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  active_sections: number;
  total_sections: number;
}

export interface CmsBuilderStateResponse {
  page: {
    slug: string;
    title: string;
    version: number;
    has_unpublished_changes: boolean;
    draft_updated_at: string | null;
    published_at: string | null;
  };
  draft: CmsPageTree;
  published: CmsPageTree;
  revisions: CmsRevisionItem[];
  templates: CmsTemplateItem[];
  media_count: number;
  allowed_section_types: SectionType[];
  allowed_block_types: BlockType[];
}
