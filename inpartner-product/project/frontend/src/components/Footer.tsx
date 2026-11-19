import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Globe, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useCmsViewport } from '@/components/cms-renderer/CmsViewportContext';
import { cmsApi } from '@/services/cms/cmsApi';
import type { CmsFooterConfig } from '@/types/cms/builder';

interface FooterProps {
  overrideFooter?: CmsFooterConfig;
  builderMode?: boolean;
  builderSelected?: boolean;
  onBuilderSelect?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  overrideFooter,
  builderMode = false,
  builderSelected = false,
  onBuilderSelect,
}) => {
  const { locale, t } = useLanguage();
  const { footer: siteFooter } = useSiteConfig();
  const { viewport } = useCmsViewport();
  const footerCfg = overrideFooter || siteFooter;

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const linkGroups = footerCfg.link_groups || [];
  const totalCols = 1 + linkGroups.length + (footerCfg.show_payment_block !== false || footerCfg.show_newsletter ? 1 : 0);

  const gridColsClass =
    viewport === 'mobile'
      ? 'grid-cols-1'
      : viewport === 'tablet'
      ? 'grid-cols-2'
      : viewport === 'desktop'
      ? totalCols >= 5
        ? 'grid-cols-5'
        : totalCols === 3
        ? 'grid-cols-3'
        : 'grid-cols-4'
      : totalCols >= 5
      ? 'grid-cols-1 md:grid-cols-5'
      : totalCols === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-4';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (builderMode || !email.trim()) return;
    try {
      await cmsApi.subscribeNewsletter(email.trim(), locale, 'footer');
      setSubscribed(true);
      setEmail('');
    } catch {
      // ignore error quietly
    }
  };

  return (
    <footer
      onClick={(e) => {
        if (builderMode && onBuilderSelect) {
          e.stopPropagation();
          onBuilderSelect();
        }
      }}
      style={{
        backgroundColor: footerCfg.background_color || '#FFFFFF',
        color: footerCfg.text_color || '#64748B',
      }}
      className={`w-full border-t border-slate-200 pt-12 pb-8 mt-20 text-xs transition-all ${
        builderMode
          ? `cursor-pointer ${
              builderSelected ? 'ring-2 ring-[#1976D2] ring-offset-2' : 'hover:ring-1 hover:ring-[#B2D1F0]'
            }`
          : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid ${gridColsClass} gap-8 mb-12`}>
          {/* Brand Column */}
          <div className="space-y-3">
            <Link
              to="/"
              onClick={(e) => {
                if (builderMode) e.preventDefault();
              }}
              className="flex items-center gap-2 group"
            >
              <img
                src={footerCfg.logo_url || '/inpartner_logo.jpeg'}
                alt={footerCfg.brand_name || 'Inpartner'}
                className="w-7 h-7 object-contain rounded-lg shadow-2xs group-hover:scale-105 transition-transform"
              />
              <span className="font-wordmark font-extrabold text-[#1976D2] text-base tracking-tight">
                {footerCfg.brand_name || 'INPARTNER'}
              </span>
            </Link>
            <p className="leading-relaxed text-xs">
              {footerCfg.description ||
                t(
                  'footer.description',
                  'Platform publikasi artikel riset, analisis industri, dan jurnal digital profesional terkurasi untuk keputusan bisnis strategis.'
                )}
            </p>

            {footerCfg.show_contact && (
              <div className="pt-2 space-y-1.5 text-[11px]">
                {footerCfg.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#1976D2] shrink-0" />
                    <span>{footerCfg.contact_email}</span>
                  </div>
                )}
                {footerCfg.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#1976D2] shrink-0" />
                    <span>{footerCfg.contact_phone}</span>
                  </div>
                )}
                {footerCfg.office_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#1976D2] shrink-0" />
                    <span>{footerCfg.office_address}</span>
                  </div>
                )}
              </div>
            )}

            {footerCfg.show_socials && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {footerCfg.social_linkedin && (
                  <a
                    href={footerCfg.social_linkedin}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (builderMode) e.preventDefault();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#D1E4F6] text-slate-700 hover:text-[#0C3B69] text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" /> LinkedIn
                  </a>
                )}
                {footerCfg.social_twitter && (
                  <a
                    href={footerCfg.social_twitter}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (builderMode) e.preventDefault();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#D1E4F6] text-slate-700 hover:text-[#0C3B69] text-[10px] font-semibold"
                  >
                    X / Twitter
                  </a>
                )}
                {footerCfg.social_instagram && (
                  <a
                    href={footerCfg.social_instagram}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (builderMode) e.preventDefault();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#D1E4F6] text-slate-700 hover:text-[#0C3B69] text-[10px] font-semibold"
                  >
                    Instagram
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Navigation Link Groups */}
          {linkGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <h4
                style={{ color: footerCfg.heading_color || '#0F172A' }}
                className="font-semibold uppercase tracking-wider text-[11px]"
              >
                {group.title}
              </h4>
              <ul className="space-y-1.5">
                {(group.links || []).map((lnk) => (
                  <li key={lnk.id}>
                    <Link
                      to={lnk.url || '/'}
                      onClick={(e) => {
                        if (builderMode) e.preventDefault();
                      }}
                      className="hover:text-[#1976D2] transition-colors"
                    >
                      {lnk.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Payment, Security & Optional Footer Newsletter */}
          {(footerCfg.show_payment_block !== false || footerCfg.show_newsletter) && (
            <div className="space-y-4">
              {footerCfg.show_payment_block !== false && (
                <div className="space-y-2">
                  <h4
                    style={{ color: footerCfg.heading_color || '#0F172A' }}
                    className="font-semibold uppercase tracking-wider text-[11px]"
                  >
                    {footerCfg.payment_title || t('footer.payment_title', 'Pembayaran & Keamanan')}
                  </h4>
                  <p className="leading-relaxed">
                    {footerCfg.payment_desc ||
                      t('footer.payment_desc', 'Transaksi diproses secara instan dan terenkripsi aman via Midtrans Payment Gateway.')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(footerCfg.payment_badges || ['Midtrans Verified', 'QRIS / Bank Transfer']).map((b, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {footerCfg.show_newsletter && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4
                    style={{ color: footerCfg.heading_color || '#0F172A' }}
                    className="font-semibold uppercase tracking-wider text-[11px]"
                  >
                    {footerCfg.newsletter_title || 'Briefing Mingguan'}
                  </h4>
                  {subscribed ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="flex gap-1.5">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={footerCfg.newsletter_placeholder || 'Email korporasi...'}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-900 focus:outline-none focus:border-[#1976D2]"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg bg-[#1976D2] hover:bg-[#1562AF] text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <span>{footerCfg.newsletter_button || 'Daftar'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>{footerCfg.copyright || `© ${new Date().getFullYear()} Inpartner Editorial Group. All rights reserved.`}</p>
          <div className="flex flex-wrap items-center gap-4 font-medium text-slate-500">
            {(footerCfg.legal_links || []).map((leg) => (
              <Link
                key={leg.id}
                to={leg.url || '/'}
                onClick={(e) => {
                  if (builderMode) e.preventDefault();
                }}
                className="hover:text-[#1976D2]"
              >
                {leg.label}
              </Link>
            ))}
            <span>{footerCfg.standard_text || t('footer.standard', 'Standar Desain & Analisis Profesional')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
