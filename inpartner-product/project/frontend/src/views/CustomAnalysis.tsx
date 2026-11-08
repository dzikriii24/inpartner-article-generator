import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Briefcase,
  ChevronRight,
  Send,
  Lock,
  BarChart3,
  Search,
  CheckCircle2,
  HelpCircle,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  Sliders,
  Scale,
  TrendingUp,
  Landmark,
  Shield,
  FileCheck,
  Compass,
  Sparkles,
  Users,
  ChevronDown,
  Mail,
  X
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';

export const CustomAnalysis: React.FC = () => {
  // Inquiry Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    position: '',
    phone: '',
    sector: 'Banking & Financial Services',
    service_type: 'Market Feasibility Study',
    topic: '',
    scope: '',
    timeline: '2-4 Minggu',
    additional_notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active FAQ Accordion state & filtering
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]); // Open first item by default
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [faqSearch, setFaqSearch] = useState<string>('');

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleExpandAllFaqs = (indices: number[]) => {
    setOpenFaqIndices(indices);
  };

  const handleCollapseAllFaqs = () => {
    setOpenFaqIndices([]);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    // Construct unified scope content to ensure comprehensive storage in backend
    const fullScopeContent = [
      `Layanan Diminta: ${formData.service_type}`,
      `Jabatan / Departemen: ${formData.position || 'Tidak disebutkan'}`,
      `Estimasi Timeline: ${formData.timeline}`,
      formData.phone ? `Kontak / WhatsApp: ${formData.phone}` : null,
      '',
      '--- Uraian Kebutuhan & Mandat Riset ---',
      formData.scope,
      formData.additional_notes ? `\n--- Catatan Tambahan ---\n${formData.additional_notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await api.post('/custom-requests', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        company: formData.company.trim() || null,
        phone: formData.phone.trim() || null,
        sector: formData.sector,
        topic: formData.topic.trim(),
        scope: fullScopeContent,
        budget_range: formData.service_type,
        timeline: formData.timeline,
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit custom research mandate', err);
      setErrorMessage(
        err.response?.data?.message ||
          'Terjadi kendala saat mengirimkan mandat riset. Silakan lengkapi formulir atau hubungi tim editorial kami melalui editorial@inpartner.id.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // FAQ Category Pillars
  const faqCategories = [
    { id: 'all', label: 'Semua Topik' },
    { id: 'scope', label: 'Ruang Lingkup & Metodologi' },
    { id: 'nda', label: 'Kerahasiaan & NDA' },
    { id: 'deliverables', label: 'Timeline & Luaran (Deliverables)' },
    { id: 'engagement', label: 'Komersial & Mandat' },
  ];

  // Comprehensive FAQ Data tailored to institutional research standards
  const faqs = [
    {
      id: 1,
      category: 'scope',
      categoryLabel: 'Ruang Lingkup & Metodologi',
      q: 'Apa yang membedakan Custom Analysis dengan laporan riset publikasi reguler di Inpartner?',
      a: 'Laporan riset reguler (seperti Thematic Research atau Sector Insights) bersifat sindikasi publik dengan cakupan makro-industri agregat. Sebaliknya, Custom Analysis & Strategic Due Diligence adalah mandat riset eksklusif (bespoke advisory engagement) yang dirancang khusus untuk menjawab hipotesis unik, parameter kompetitor riil, studi kelayakan akuisisi, atau telaah transaksi korporasi Anda. Hasil analisis bersifat kepemilikan privat institusi Anda dan tidak dipublikasikan ke publik.',
      highlights: [
        'Mandat khusus sesuai target institusi',
        'Parameter benchmarking & kompetitor riil',
        'Kepemilikan privat & non-publikasi',
      ],
    },
    {
      id: 2,
      category: 'scope',
      categoryLabel: 'Ruang Lingkup & Metodologi',
      q: 'Cakupan riset dan analisis apa saja yang dapat dimandatkan oleh institusi?',
      a: 'Layanan kami mencakup 4 pilar utama yang dapat dipilih mandiri atau dikombinasikan secara terintegrasi:\n1. Market Feasibility & Expansion: Estimasi Total Addressable Market (TAM/SAM/SOM), analisis rantai pasok industri, dan studi penetrasi pasar.\n2. Regulatory & Sectoral Research: Evaluasi dampak kebijakan OJK, BI, KPPU, tarif fiskal, dan kepatuhan regulasi sektoral.\n3. Financial Modeling & Valuation: Pemodelan DCF multi-skenario, sensitivity analysis, stress-testing likuiditas, dan benchmarking valuasi multiples emiten sejenis.\n4. Commercial & Strategic Due Diligence: Audit independen pra-M&A/investasi, penilaian risiko komersial, dan uji tuntas unit economics.',
      highlights: [
        'Market Feasibility & TAM Modeling',
        'Regulatory Impact Assessment',
        'Financial Valuation & Sensitivity',
        'Strategic Due Diligence Pra-M&A',
      ],
    },
    {
      id: 3,
      category: 'scope',
      categoryLabel: 'Ruang Lingkup & Metodologi',
      q: 'Bagaimana metodologi riset dan validitas data yang digunakan dalam analisis?',
      a: 'Kami mengombinasikan Primary Research (wawancara mendalam terverifikasi dengan pimpinan asosiasi, pelaku industri, dan pakar regulasi) serta Secondary Research berbasis data resmi otoritatif (laporan keuangan emiten IDX, basis data statistik BPS, Bank Indonesia, OJK, dan kementerian teknis). Seluruh data mentah, rumus pemodelan, dan sumber kutipan dilampirkan secara transparan dalam format yang dapat diaudit secara independen.',
      highlights: [
        'Primary Interviews dengan pakar industri terverifikasi',
        'Data sekunder resmi otoritas (BPS, BI, OJK, IDX)',
        'Seluruh sumber data dapat diaudit (auditable)',
      ],
    },
    {
      id: 4,
      category: 'nda',
      categoryLabel: 'Kerahasiaan & NDA',
      q: 'Bagaimana penanganan kerahasiaan informasi dan penandatanganan NDA?',
      a: 'Kerahasiaan merupakan komitmen fundamental kami. Sebelum pertukaran data internal atau diskusi teknis lanjutan dimulai, kami menandatangani Non-Disclosure Agreement (NDA) formal yang mengikat secara hukum. Klien dapat menggunakan draf NDA standar dari Inpartner atau mengajukan draf standar dari divisi legal korporasi Anda untuk diselaraskan bersama.',
      highlights: [
        'Perjanjian Kerahasiaan (NDA) bilateral formal',
        'Dukungan draf legal institusi klien',
        'Komitmen perlindungan data berkekuatan hukum',
      ],
    },
    {
      id: 5,
      category: 'nda',
      categoryLabel: 'Kerahasiaan & NDA',
      q: 'Bagaimana tata kelola isolasi data internal selama proses pengerjaan proyek?',
      a: 'Kami menerapkan protokol Information Barrier (Chinese Wall) yang ketat. Akses terhadap dokumen proyek dan data mandat dibatasi secara terisolasi hanya untuk tim analis senior yang ditugaskan secara resmi pada proyek tersebut. Seluruh lingkungan kerja menggunakan enkripsi standar industri perbankan (AES-256), dan pasca penyelesaian engagement, seluruh berkas sensitif milik klien akan diarsipkan atau dihapus permanen sesuai kesepakatan retensi data.',
      highlights: [
        'Protokol pembatasan akses tim (Chinese Wall)',
        'Penyimpanan terenkripsi AES-256',
        'Klausul retensi dan pembersihan data klien',
      ],
    },
    {
      id: 6,
      category: 'deliverables',
      categoryLabel: 'Timeline & Luaran (Deliverables)',
      q: 'Berapa lama estimasi durasi pengerjaan riset kustom?',
      a: 'Durasi pengerjaan disesuaikan dengan kedalaman cakupan mandat:\n• Rapid Assessment / Executive Policy Brief: 1–2 minggu kerja.\n• Focused Sector Study / Feasibility Study: 2–4 minggu kerja.\n• Comprehensive Due Diligence & Financial Modeling: 4–6 minggu kerja.\nTimeline definitif beserta tahapan checkpoint mingguan (Weekly Progress Update) akan dituangkan secara rinci dalam proposal formal.',
      highlights: [
        'Brief / Policy Memo: 1–2 Minggu Kerja',
        'Studi Kelayakan Sektoral: 2–4 Minggu Kerja',
        'Due Diligence Menyeluruh: 4–6 Minggu Kerja',
      ],
    },
    {
      id: 7,
      category: 'deliverables',
      categoryLabel: 'Timeline & Luaran (Deliverables)',
      q: 'Apa saja bentuk deliverables yang akan diterima oleh institusi?',
      a: 'Paket deliverables dirancang siap pakai untuk level Dewan Direksi dan Komite Investasi, mencakup:\n1. Executive Research Report (PDF): Dokumen kajian lengkap berstandar institusi dengan executive summary, metodologi, temuan empiris, dan strategic implications.\n2. Board Presentation Deck (PPTX/PDF): Slide ringkasan eksekutif padat untuk kebutuhan rapat direksi atau komite manajemen.\n3. Dynamic Financial Model (XLSX): Spreadsheet pemodelan interaktif tanpa formula terkunci atau macro tersembunyi.\n4. Executive Briefing Session: Sesi presentasi langsung dan tanya jawab mendalam bersama Senior Partner dan Lead Analyst penyusun.',
      deliverablesTags: ['PDF Laporan Lengkap', 'PPTX Board Deck', 'Dynamic XLSX Model', 'Sesi Tanya Jawab Analis'],
    },
    {
      id: 8,
      category: 'engagement',
      categoryLabel: 'Komersial & Mandat',
      q: 'Bagaimana struktur pembiayaan (fee structure) untuk layanan ini?',
      a: 'Pembiayaan ditentukan secara transparan dan proporsional berdasarkan ruang lingkup pekerjaan (Scope of Work), tingkat kerumitan data primer, serta keterlibatan Senior Partner. Kami menyediakan dua skema keterlibatan:\n• Project-Based Engagement: Nilai kontrak tetap (fixed-fee) berbasis pencapaian milestone (Inisiasi, Draf Laporan, dan Finalisasi Luaran).\n• Retainer Advisory: Skema pendampingan riset berkelanjutan untuk korporasi dengan kebutuhan analisis rutin multi-periode.',
      highlights: [
        'Fixed-fee transparan berbasis milestone',
        'Pilihan skema Project-based atau Retainer',
        'Ruang lingkup transparan tanpa biaya tersembunyi',
      ],
    },
    {
      id: 9,
      category: 'engagement',
      categoryLabel: 'Komersial & Mandat',
      q: 'Bagaimana alur dan langkah awal untuk mengajukan mandat riset?',
      a: 'Langkah pertama sangat mudah dan responsif:\n1. Ajukan kebutuhan Anda melalui Formulir Mandat Riset di halaman ini atau hubungi kami melalui surel resmi.\n2. Tim editorial dan analis kami akan menghubungi Anda dalam waktu 1x24 jam kerja untuk sesi pendahuluan (Discovery Call 30 menit).\n3. Kami menyusun dan mengirimkan Kerangka Acuan Kerja (Term of Reference) dan proposal komersial formal untuk ditelaah institusi Anda.',
      highlights: [
        'Langkah 1: Pengisian formulir mandat di halaman ini',
        'Langkah 2: Discovery call 30 menit dalam 1x24 jam kerja',
        'Langkah 3: Penerbitan proposal teknis & komersial formal',
      ],
    },
  ];

  // Memoized filtered FAQs
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = faqCategory === 'all' || faq.category === faqCategory;
      const qLower = faq.q.toLowerCase();
      const aLower = faq.a.toLowerCase();
      const sLower = faqSearch.toLowerCase().trim();
      const matchesSearch = !sLower || qLower.includes(sLower) || aLower.includes(sLower);
      return matchesCategory && matchesSearch;
    });
  }, [faqCategory, faqSearch]);

  // Industry sectors for potential coverage
  const industrySectors = [
    { name: 'Banking & Financial Services', icon: Landmark, desc: 'Perbankan komersial, likuiditas, NPL & transmisi moneter' },
    { name: 'Insurance & Pension Funds', icon: Shield, desc: 'Manajemen solvabilitas, portofolio aset & dinamika aktuaria' },
    { name: 'Capital Markets & Asset Management', icon: TrendingUp, desc: 'Struktur pasar modal, valuasi emiten & aliran dana institusi' },
    { name: 'Energy & Natural Resources', icon: BarChart3, desc: 'Transisi energi, hilirisasi mineral kritis & komoditas' },
    { name: 'Healthcare & Pharmaceuticals', icon: FileCheck, desc: 'Rantai pasok farmasi, regulasi BPJS & pasar layanan kesehatan' },
    { name: 'Telecommunications & Technology', icon: Sparkles, desc: 'Infrastruktur digital, ekonomi AI & telekomunikasi riil' },
    { name: 'Infrastructure & Construction', icon: Building2, desc: 'Proyek strategis nasional, konektivitas & logistik maritim' },
    { name: 'Consumer Goods & Retail', icon: Users, desc: 'Daya beli masyarakat, pola konsumsi domestik & omnichannel' },
    { name: 'Manufacturing & Industrial', icon: Layers, desc: 'Efisiensi rantai pasok industri, substitusi impor & manufaktur' },
    { name: 'Property & Real Estate', icon: Briefcase, desc: 'Pasar properti komersial, perumahan & dinamika suku bunga KPR' },
    { name: 'Transportation & Logistics', icon: Compass, desc: 'Efisiensi logistik terintegrasi & multimoda nasional' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-16 sm:space-y-24 font-sans text-slate-800">
      
      {/* 1. BREADCRUMBS */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-[#1976D2] transition-colors font-medium">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Layanan Riset Eksklusif</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-semibold truncate">
          Custom Analysis & Strategic Due Diligence
        </span>
      </nav>

      {/* 2. HERO SECTION — POSITIONING & VALUE PROPOSITION */}
      <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 lg:p-16 shadow-xs overflow-hidden">
        {/* Soft Ambient Brand Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D1E4F6]/40 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-slate-50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Top Label */}
          

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            Custom Analysis & Strategic Due Diligence
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-slate-600 font-supporting leading-relaxed max-w-3xl">
            Penyusunan studi kelayakan pasar, kajian regulasi sektoral, pemodelan finansial, dan audit industri yang disesuaikan khusus dengan mandat strategi institusi Anda.
          </p>

          {/* Value Highlights Pill Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
              <span>Institutional-Grade Advisory</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-medium">
              <Lock className="w-3.5 h-3.5 text-[#1976D2]" />
              <span>Strict Non-Disclosure Protocol</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dynamic Financial & Dataset Models</span>
            </span>
          </div>

          {/* Call to Actions */}
          <div className="pt-4 flex flex-wrap items-center gap-3 sm:gap-4">
            <Button
              onClick={() => scrollToSection('inquiry-form')}
              className="bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span>Ajukan Konsultasi Riset</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => scrollToSection('capabilities')}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl cursor-pointer"
            >
              Jelajahi Kapabilitas Layanan
            </Button>
          </div>
        </div>
      </section>

      {/* 3. ABOUT THE SERVICE — GAMBARAN LAYANAN */}
      <section className="space-y-8">
        <div className="max-w-3xl space-y-3">
         
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Riset Berbasis Bukti yang Dirancang untuk Keputusan Tingkat Strategis
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-supporting leading-relaxed">
            Layanan Custom Analysis & Strategic Due Diligence dirancang untuk membantu jajaran manajemen, komite risiko, dan divisi strategi korporasi menavigasi dinamika pasar yang kompleks. Berbeda dari laporan publikasi umum, setiap proyek disusun spesifik berdasarkan mandat, pertanyaan strategis, dan toleransi risiko organisasi Anda.
          </p>
        </div>

        {/* 5 Core Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#1976D2] flex items-center justify-center font-bold text-sm">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Tailored Research Approach</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Metodologi riset, parameter analisis, dan hipotesis disesuaikan secara menyeluruh dengan tujuan bisnis dan konteks unik institusi Anda.
            </p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#1976D2] flex items-center justify-center font-bold text-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Institution-Specific Analysis</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Fokus pada studi kasus nyata, pemetaan kompetitor relevan, serta profil kapabilitas internal tanpa generalisasi abstrak.
            </p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#1976D2] flex items-center justify-center font-bold text-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Evidence-Based Insights</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Seluruh argumen didasarkan pada dataset resmi, laporan keuangan emiten terverifikasi, dan data regulasi primer yang dapat diaudit.
            </p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#1976D2] flex items-center justify-center font-bold text-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Strategic Decision Support</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Menyediakan rekomendasi yang siap dieksekusi oleh Dewan Direksi, Komite Investasi, dan perencana strategi bisnis.
            </p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#1976D2] flex items-center justify-center font-bold text-sm">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Confidential Research Engagement</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Penerapan klausul kerahasiaan formal (NDA) yang mengikat, memastikan mandat dan data sensitif institusi terlindungi sepenuhnya.
            </p>
          </Card>
        </div>
      </section>

      {/* 4. CORE SERVICE CAPABILITIES */}
      <section id="capabilities" className="space-y-8 scroll-mt-24">
        <div className="max-w-3xl space-y-3">
         
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Empat Pilar Kapabilitas Riset Strategis
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-supporting leading-relaxed">
            Struktur layanan kami mencakup spektrum lengkap analisis bisnis dan finansial, mulai dari verifikasi kelayakan pasar hingga audit mendalam struktur industri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Capability A */}
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#D1E4F6]/50 text-[#0C3B69] border border-[#B2D1F0] flex items-center justify-center text-xs font-bold">
                  A
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Studi Pasar
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Market Feasibility Study</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
                Evaluasi komprehensif terhadap potensi penyerapan pasar, pergerakan permintaan dan pasokan, serta pemetaan peluang ekspansi produk atau layanan baru.
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ruang Lingkup Pekerjaan:
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-supporting">
                  <li>Market sizing (TAM, SAM, SOM) berbasis metodologi terverifikasi</li>
                  <li>Analisis keseimbangan demand & supply domestik serta regional</li>
                  <li>Evaluasi strategi masuk pasar (market entry assessment)</li>
                  <li>Pemetaan lanskap kompetitif & benchmarking pangsa pasar</li>
                  <li>Identifikasi hambatan masuk (barriers to entry) & substitusi</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-[#1976D2] uppercase tracking-wider block">
                Deliverables / Hasil Akhir:
              </span>
              <p className="text-xs text-slate-600 font-supporting">
                Laporan Kelayakan Komprehensif (PDF), Model Estimasi Pasar (XLS), Executive Summary Deck.
              </p>
            </div>
          </Card>

          {/* Capability B */}
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#D1E4F6]/50 text-[#0C3B69] border border-[#B2D1F0] flex items-center justify-center text-xs font-bold">
                  B
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Regulasi & Kebijakan
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Regulatory & Sectoral Research</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
                Kajian mendalam terhadap lanskap kebijakan sektoral, kepatuhan regulasi OJK, BI, kementerian teknis, serta mitigasi risiko kepatuhan hukum.
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ruang Lingkup Pekerjaan:
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-supporting">
                  <li>Kajian regulasi sektoral dan arah kebijakan pemerintah</li>
                  <li>Regulatory impact assessment terhadap model bisnis korporasi</li>
                  <li>Analisis kepatuhan (policy & compliance analysis) lintas lembaga</li>
                  <li>Pemetaan matriks kerangka hukum industri (regulatory mapping)</li>
                  <li>Identifikasi dini risiko regulasi & skenario perubahan kebijakan</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-[#1976D2] uppercase tracking-wider block">
                Deliverables / Hasil Akhir:
              </span>
              <p className="text-xs text-slate-600 font-supporting">
                Policy Brief & Compliance Matrix (PDF), Regulatory Risk Radar, Matriks Rekomendasi Adaptasi Kebijakan.
              </p>
            </div>
          </Card>

          {/* Capability C */}
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#D1E4F6]/50 text-[#0C3B69] border border-[#B2D1F0] flex items-center justify-center text-xs font-bold">
                  C
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Finansial & Valuasi
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Financial Modeling & Valuation</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
                Penyusunan proyeksi keuangan dinamis, evaluasi kelayakan investasi modal, analisis sensitivitas multi-skenario, dan penilaian model bisnis.
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ruang Lingkup Pekerjaan:
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-supporting">
                  <li>Penyusunan proyeksi keuangan jangka menengah (3–5 tahun)</li>
                  <li>Evaluasi kelayakan investasi (IRR, NPV, Payback Period, WACC)</li>
                  <li>Pemodelan simulasi skenario (Base, Conservative, Stress-test)</li>
                  <li>Analisis sensitivitas parameter biaya, harga, dan suku bunga</li>
                  <li>Benchmarking margin laba & struktur permodalan industri</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-[#1976D2] uppercase tracking-wider block">
                Deliverables / Hasil Akhir:
              </span>
              <p className="text-xs text-slate-600 font-supporting">
                Spreadsheet Model Finansial Dinamis (XLS/XLSX), Laporan Analisis Sensitivitas (PDF), Investment Memorandum.
              </p>
            </div>
          </Card>

          {/* Capability D */}
          <Card className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#D1E4F6]/50 text-[#0C3B69] border border-[#B2D1F0] flex items-center justify-center text-xs font-bold">
                  D
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Due Diligence
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Industry Audit & Strategic Due Diligence</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
                Audit menyeluruh terhadap struktur industri, rantai pasok, postur keunggulan bersaing, dan mitigasi risiko sebelum aksi korporasi strategis.
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ruang Lingkup Pekerjaan:
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-supporting">
                  <li>Audit struktur rantai pasok dan dinamika rantai nilai industri</li>
                  <li>Benchmarking kompetitif mendalam terhadap pemain utama</li>
                  <li>Identifikasi risiko operasional, ketergantungan pemasok, dan pasar</li>
                  <li>Evaluasi sinergi strategis pra-akuisisi atau kemitraan usaha</li>
                  <li>Penilaian peluang strategis baru dalam siklus ekonomi makro</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-[#1976D2] uppercase tracking-wider block">
                Deliverables / Hasil Akhir:
              </span>
              <p className="text-xs text-slate-600 font-supporting">
                Dossier Audit Industri (PDF), Peta Risiko Strategis & Mitigasi, Presentasi Pengambil Keputusan.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. INDUSTRY COVERAGE */}
      <section className="space-y-8">
        <div className="max-w-3xl space-y-3">
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pemahaman Sektoral Mendalam Lintas Industri
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-supporting leading-relaxed">
            Metodologi riset kami dirancang untuk mampu membedah karakteristik spesifik berbagai sektor industri utama di Indonesia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {industrySectors.map((sector, idx) => {
            const Icon = sector.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#B2D1F0] hover:shadow-2xs transition-all space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1976D2]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{sector.name}</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-supporting leading-relaxed pl-10">
                  {sector.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 font-supporting flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1976D2] shrink-0" />
          <span>
            Daftar di atas merupakan cakupan potensial kapabilitas metodologi riset kami. Penugasan riset akan diselaraskan dengan ketersediaan data sekunder resmi dan verifikasi primer yang relevan.
          </span>
        </div>
      </section>

      {/* 6. RESEARCH METHODOLOGY & WORKING APPROACH */}
      <section className="space-y-8">
        <div className="max-w-3xl space-y-3">
         
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Alur Pengerjaan Terstruktur, Terukur, dan Transparan
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-supporting leading-relaxed">
            Setiap proyek dikelola melalui siklus pengerjaan 6 tahap yang terstandarisasi untuk menjamin akurasi data dan ketepatan waktu deliverables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 relative shadow-xs">
            <span className="text-xs font-bold text-[#1976D2] font-mono">01. INITIATION</span>
            <h3 className="text-sm font-bold text-slate-900">Initial Consultation & Mandate</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Pertemuan awal untuk mendiskusikan kebutuhan, mandat strategis, tantangan operasional, dan pertanyaan kunci yang dihadapi institusi.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 relative shadow-xs">
            <span className="text-xs font-bold text-[#1976D2] font-mono">02. SCOPING</span>
            <h3 className="text-sm font-bold text-slate-900">Research Design & Scoping</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Penyusunan proposal formal yang merinci metodologi riset, parameter data, kerangka deliverables, dan linimasa pengerjaan yang disepakati.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 relative shadow-xs">
            <span className="text-xs font-bold text-[#1976D2] font-mono">03. DATA MINING</span>
            <h3 className="text-sm font-bold text-slate-900">Data Collection & Validation</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Pengumpulan data resmi dari regulator, laporan emiten terverifikasi, dan dataset sektoral dengan proses validasi silang (cross-validation).
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 relative shadow-xs">
            <span className="text-xs font-bold text-[#1976D2] font-mono">04. ANALYSIS</span>
            <h3 className="text-sm font-bold text-slate-900">Analysis & Assessment</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Pemrosesan analitis menggunakan kerangka pasar, evaluasi dampak regulasi, atau simulasi sensitivitas finansial multi-skenario.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 relative shadow-xs">
            <span className="text-xs font-bold text-[#1976D2] font-mono">05. SYNTHESIS</span>
            <h3 className="text-sm font-bold text-slate-900">Strategic Findings & Actions</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Perumusan temuan inti, pemetaan matriks risiko, dan rekomendasi aksi strategis yang aplikatif bagi pengambil keputusan organisasi.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 relative shadow-xs">
            <span className="text-xs font-bold text-[#1976D2] font-mono">06. DELIVERY</span>
            <h3 className="text-sm font-bold text-slate-900">Final Report & Presentation</h3>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Penyerahan laporan akhir lengkap (PDF/XLS) dan sesi paparan eksekutif langsung bersama dewan manajemen atau komite terkait.
            </p>
          </div>
        </div>
      </section>

      {/* 7. DELIVERABLES & OUTPUT FORMAT */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs space-y-6">
        <div className="max-w-3xl space-y-2">
          
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Output Penelitian Berstandar Institusional
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
            Seluruh hasil pekerjaan diserahkan dalam format siap guna yang memudahkan penelaahan internal maupun pelaporan eksekutif.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
              <FileText className="w-4 h-4" />
              <span>Full Research Report</span>
            </div>
            <p className="text-[11px] text-slate-600 font-supporting">
              Format PDF beresolusi tinggi dengan struktur akademis profesional, metodologi, data analitis, dan daftar referensi lengkap.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-[#1976D2] font-bold text-xs">
              <Layers className="w-4 h-4" />
              <span>Executive Slide Deck</span>
            </div>
            <p className="text-[11px] text-slate-600 font-supporting">
              Format PPTX & PDF ringkas untuk bahan paparan langsung jajaran direksi, komite investasi, atau pemegang saham.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Financial & Dataset Model</span>
            </div>
            <p className="text-[11px] text-slate-600 font-supporting">
              File Excel dinamis (XLSX) dengan formula kalkulasi aktif, tabel data historis, dan simulasi skenario sensitivitas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
              <Users className="w-4 h-4" />
              <span>Briefing & Q&A Session</span>
            </div>
            <p className="text-[11px] text-slate-600 font-supporting">
              Sesi presentasi virtual atau tatap muka langsung bersama Senior Fellow analis untuk mendiskusikan temuan dan menjawab pertanyaan teknis.
            </p>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-500 font-supporting border-t border-slate-100">
          * Catatan: Paket output akhir disesuaikan sepenuhnya berdasarkan kesepakatan ruang lingkup dalam proposal formal proyek Anda.
        </div>
      </section>

      {/* 8. WHO WE SERVE — TARGET CLIENTS */}
      <section className="space-y-8">
        <div className="max-w-3xl space-y-3">
        
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dirancang Khusus untuk Pembuat Keputusan Institusi
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-supporting leading-relaxed">
            Layanan kami dirancang untuk mendukung berbagai fungsi strategis pada korporasi dan institusi keuangan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
            <div className="font-bold text-xs text-slate-900">Perbankan & Lembaga Keuangan</div>
            <p className="text-[11px] text-slate-500 font-supporting leading-relaxed">
              Mendukung kajian ekspansi portofolio kredit sektoral, stres-tes makroekonomi, dan evaluasi kepatuhan batas penyaluran pembiayaan.
            </p>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
            <div className="font-bold text-xs text-slate-900">Divisi Corporate Strategy</div>
            <p className="text-[11px] text-slate-500 font-supporting leading-relaxed">
              Menyediakan telaah independen untuk perencanaan bisnis jangka panjang (RJPP), studi kelayakan ekspansi, dan kajian masuk pasar.
            </p>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
            <div className="font-bold text-xs text-slate-900">Komite Manajemen Risiko</div>
            <p className="text-[11px] text-slate-500 font-supporting leading-relaxed">
              Memberikan audit struktur industri eksternal, pemetaan risiko rantai pasok, dan pemantauan dinamika regulasi sektoral.
            </p>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
            <div className="font-bold text-xs text-slate-900">Investor Institusional & PE</div>
            <p className="text-[11px] text-slate-500 font-supporting leading-relaxed">
              Membantu due diligence strategis pra-investasi, penilaian kewajaran valuasi pasar, dan validasi data fundamental target.
            </p>
          </Card>
        </div>
      </section>

      {/* 9. WHY CUSTOM RESEARCH */}
      <section className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-12 space-y-6">
        <div className="max-w-3xl space-y-2">
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mengapa Memilih Riset Kustom Dibandingkan Laporan Standar?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
            Laporan umum memberikan gambaran makro, tetapi riset kustom menjawab tantangan operasional spesifik yang dihadapi organisasi Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="font-bold text-xs text-[#1976D2] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mandat yang Presisi</span>
            </div>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Tidak ada pembahasan yang tidak relevan. Seluruh analisis difokuskan langsung pada pertanyaan strategis yang sedang diputuskan oleh manajemen.
            </p>
          </div>

          <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="font-bold text-xs text-[#1976D2] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sumber Data Tertelusuri</span>
            </div>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Seluruh angka dan asumsi dilengkapi rujukan sumber resmi yang transparan dan dapat diaudit oleh komite risiko maupun auditor internal.
            </p>
          </div>

          <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="font-bold text-xs text-[#1976D2] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Aksi Nyata & Aplikatif</span>
            </div>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Menghubungkan temuan data dengan implikasi bisnis nyata, memberikan rekomendasi praktis yang siap diimplementasikan.
            </p>
          </div>
        </div>
      </section>

      {/* 10. ENGAGEMENT PROCESS & PROJECT INQUIRY FORM */}
      <section id="inquiry-form" className="scroll-mt-24">
        <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-10 lg:p-12 shadow-xs space-y-8">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Discuss Your Research Mandate
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
              Sampaikan kebutuhan riset, tujuan strategis, dan ruang lingkup yang diharapkan. Tim analis senior Inpartner akan menelaah kerangka kebutuhan dan menghubungi Anda dalam 1x24 jam kerja dengan proposal formal.
            </p>
          </div>

          {submitted ? (
            <div className="max-w-xl mx-auto py-12 text-center space-y-4 bg-emerald-50 border border-emerald-200 rounded-3xl p-8">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Mandat Riset Kustom Berhasil Diterima
                </h3>
                <p className="text-xs text-slate-600 font-supporting leading-relaxed max-w-md mx-auto">
                  Terima kasih atas kepercayaan institusi Anda. Kerangka mandat ini telah diteruskan ke tim Analis Senior Inpartner. Kami akan menghubungi Anda melalui email{' '}
                  <span className="font-bold text-slate-900">{formData.email}</span> untuk koordinasi awal dan pengiriman proposal formal.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Ajukan Mandat Riset Lainnya
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 text-xs">
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Group 1: Contact Information */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
                  1. Informasi Kontak & Institusi
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nama lengkap dan gelar (jika ada)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Email Institusional / Korporat *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nama@perusahaan.co.id"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Organisasi / Institusi *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Nama resmi perusahaan"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Jabatan / Departemen
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="Contoh: VP Corporate Strategy"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Nomor Kontak / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62 812-xxxx-xxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Research Mandate Details */}
              <div className="space-y-4 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
                  2. Rincian Mandat Riset
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Sektor Industri Relevan *
                    </label>
                    <select
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#1976D2] font-medium"
                    >
                      <option value="Banking & Financial Services">Banking & Financial Services</option>
                      <option value="Insurance & Pension Funds">Insurance & Pension Funds</option>
                      <option value="Capital Markets & Asset Management">Capital Markets & Asset Management</option>
                      <option value="Energy & Natural Resources">Energy & Natural Resources</option>
                      <option value="Healthcare & Pharmaceuticals">Healthcare & Pharmaceuticals</option>
                      <option value="Telecommunications & Technology">Telecommunications & Technology</option>
                      <option value="Infrastructure & Construction">Infrastructure & Construction</option>
                      <option value="Consumer Goods & Retail">Consumer Goods & Retail</option>
                      <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                      <option value="Property & Real Estate">Property & Real Estate</option>
                      <option value="Transportation & Logistics">Transportation & Logistics</option>
                      <option value="Lainnya">Sektor Industri Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Jenis Layanan Riset *
                    </label>
                    <select
                      value={formData.service_type}
                      onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#1976D2] font-medium"
                    >
                      <option value="Market Feasibility Study">Market Feasibility Study</option>
                      <option value="Regulatory & Sectoral Research">Regulatory & Sectoral Research</option>
                      <option value="Financial Modeling & Valuation">Financial Modeling & Valuation</option>
                      <option value="Industry Audit & Strategic Due Diligence">Industry Audit & Strategic Due Diligence</option>
                      <option value="Kombinasi / Mandat Khusus">Kombinasi / Mandat Khusus</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Tujuan Riset / Judul Mandat *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Contoh: Studi Kelayakan Ekspansi Pembiayaan Energi Terbarukan 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Ruang Lingkup & Pertanyaan Strategis yang Ingin Dijawab *
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={20}
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    placeholder="Jelaskan variabel yang ingin diteliti, target pembanding kompetitor, cakupan geografis, atau skenario risiko yang perlu dievaluasi..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] leading-relaxed font-supporting"
                  />
                  <span className="text-[10px] text-slate-400">Minimal 20 karakter penjelasan ruang lingkup.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Estimasi Linimasa yang Diharapkan
                    </label>
                    <select
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#1976D2]"
                    >
                      <option value="1-2 Minggu">1–2 Minggu Kerja (Kajian Terarah / Ringkas)</option>
                      <option value="2-4 Minggu">2–4 Minggu Kerja (Standar Mendalam)</option>
                      <option value="1-2 Bulan">1–2 Bulan (Audit Komprehensif Multi-Sektor)</option>
                      <option value="Fleksibel / Sesuai Kesepakatan">Fleksibel / Sesuai Kesepakatan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.additional_notes}
                      onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                      placeholder="Kebutuhan format khusus, jadwal rapat, atau instruksi NDA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold text-xs sm:text-sm py-3.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Mengirimkan Mandat Riset...' : 'Kirimkan Mandat Riset untuk Ditelaah'}</span>
                </Button>

                <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 font-supporting">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Seluruh data formulir dilindungi kebijakan kerahasiaan institusional Inpartner.</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 11. CONFIDENTIALITY & DATA HANDLING */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs space-y-6">
        <div className="max-w-3xl space-y-2">
          
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Perlindungan Data & Kerahasiaan Tingkat Korporasi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
            Kami memahami bahwa informasi strategi dan data korporasi bersifat sensitif. Standar tata kelola kami dirancang untuk memastikan keamanan informasi pada setiap tahap penugasan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#1976D2]" />
              <span>Non-Disclosure Agreement (NDA) Formal</span>
            </div>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Sebelum pertukaran data internal atau diskusi teknis lanjutan, kami siap menandatangani perjanjian kerahasiaan formal yang disepakati oleh bagian legal institusi Anda.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
              <span>Akses Terisolasi & Bertanggung Jawab</span>
            </div>
            <p className="text-xs text-slate-600 font-supporting leading-relaxed">
              Dokumen proyek dan data mandat hanya dapat diakses oleh tim analis yang secara resmi ditugaskan pada proyek tersebut. Tidak ada data yang dibagikan atau dipublikasikan.
            </p>
          </div>
        </div>
      </section>

      {/* 12. FAQ — FREQUENTLY ASKED QUESTIONS */}
      <section id="faq-section" className="space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="max-w-3xl space-y-3">
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Pertanyaan Umum Seputar Layanan Riset Kustom
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-supporting leading-relaxed">
              Penjelasan terperinci mengenai tata kelola, protokol kerahasiaan NDA, metodologi riset, durasi pengerjaan, dan format luaran bagi korporasi dan institusi keuangan.
            </p>
          </div>

          {/* Quick Action Toggle All */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExpandAllFaqs(filteredFaqs.map((_, i) => i))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={handleCollapseAllFaqs}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-2xl">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {faqCategories.map((cat) => {
              const count = cat.id === 'all'
                ? faqs.length
                : faqs.filter((f) => f.category === cat.id).length;
              const isActive = faqCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFaqCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1976D2] text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Cari kata kunci FAQ..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] text-slate-800 placeholder:text-slate-400 font-medium"
            />
            {faqSearch && (
              <button
                type="button"
                onClick={() => setFaqSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results Counter if Filtered */}
        {(faqCategory !== 'all' || faqSearch) && (
          <div className="flex items-center justify-between text-xs text-slate-500 font-supporting px-1">
            <span>
              Menampilkan <strong className="text-slate-800">{filteredFaqs.length}</strong> pertanyaan{' '}
              {faqCategory !== 'all' ? `dalam kategori "${faqCategories.find(c => c.id === faqCategory)?.label}"` : ''}
              {faqSearch ? ` untuk kata kunci "${faqSearch}"` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setFaqCategory('all');
                setFaqSearch('');
              }}
              className="text-[#1976D2] hover:underline font-semibold cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}

        {/* Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                Tidak ada pertanyaan yang sesuai dengan kata kunci "{faqSearch}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setFaqCategory('all');
                  setFaqSearch('');
                }}
                className="text-xs font-bold text-[#1976D2] hover:underline cursor-pointer"
              >
                Reset pencarian dan tampilkan semua pertanyaan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndices.includes(idx);
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl bg-white border transition-all duration-200 overflow-hidden ${
                      isOpen
                        ? 'border-[#1976D2] border-l-4 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className={`w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                        isOpen ? 'bg-[#D1E4F6]/15' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1976D2] bg-[#D1E4F6]/50 border border-[#B2D1F0] px-2 py-0.5 rounded-md">
                            {faq.categoryLabel}
                          </span>
                        </div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                          {faq.q}
                        </h3>
                      </div>
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isOpen
                            ? 'bg-[#1976D2] text-white rotate-180'
                            : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-white space-y-4 text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed">
                        <p className="whitespace-pre-line text-slate-700 leading-relaxed">
                          {faq.a}
                        </p>

                        {/* Optional Key Highlights */}
                        {faq.highlights && faq.highlights.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">
                              Poin Kunci:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {faq.highlights.map((h, hIdx) => (
                                <div
                                  key={hIdx}
                                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] font-medium text-slate-700 font-sans"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1976D2] shrink-0" />
                                  <span className="truncate">{h}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Optional Deliverables Tags */}
                        {faq.deliverablesTags && faq.deliverablesTags.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">
                              Format Luaran Deliverables:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {faq.deliverablesTags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold font-sans shadow-2xs"
                                >
                                  {tag.includes('PDF') && <FileText className="w-3.5 h-3.5 text-rose-600" />}
                                  {tag.includes('PPTX') && <Layers className="w-3.5 h-3.5 text-amber-600" />}
                                  {tag.includes('XLSX') && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                                  {tag.includes('Sesi') && <Users className="w-3.5 h-3.5 text-[#1976D2]" />}
                                  <span>{tag}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dedicated Institutional Inquiry Help Box */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-50 to-white border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-1.5 max-w-2xl">
            
            <h4 className="text-base sm:text-lg font-bold text-slate-900">
              Memiliki Pertanyaan Khusus Terkait Mandat Organisasi Anda?
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 font-supporting leading-relaxed">
              Tim partner dan analis riset kami siap mendiskusikan parameter spesifik dan menyusun proposal teknis yang tepat untuk kebutuhan institusi Anda dalam 1x24 jam kerja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => scrollToSection('inquiry-form')}
              className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ajukan Mandat Riset</span>
            </Button>
            <a
              href="mailto:editorial@inpartner.id?subject=Inquiry%20Custom%20Analysis%20%26%20Due%20Diligence"
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>editorial@inpartner.id</span>
            </a>
          </div>
        </div>
      </section>

      {/* 13. BOTTOM INSTITUTIONAL BANNER */}
      <section className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Siap Membahas Kebutuhan Analisis Institusi Anda?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-supporting leading-relaxed">
            Hubungi tim analis kami untuk menjadwalkan sesi pendahuluan dan mendefinisikan ruang lingkup riset secara mendalam.
          </p>
        </div>
        <Button
          onClick={() => scrollToSection('inquiry-form')}
          className="bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl shadow-xs cursor-pointer shrink-0"
        >
          Ajukan Mandat Sekarang
        </Button>
      </section>

    </div>
  );
};

export default CustomAnalysis;
