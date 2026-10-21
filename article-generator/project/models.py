from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, Date, JSON, Enum as SqlEnum, Table
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from database import Base

article_sources = Table(
    'article_sources',
    Base.metadata,
    Column('article_id', Integer, ForeignKey('generated_articles.id'), primary_key=True),
    Column('source_id', Integer, ForeignKey('sources.id'), primary_key=True)
)


class ArticleStatus(enum.Enum):
    DISCOVERED = "DISCOVERED"
    RESEARCHING = "RESEARCHING"
    GENERATING = "GENERATING"
    FACT_CHECKING = "FACT_CHECKING"
    DRAFT = "DRAFT"
    READY = "READY"
    FAILED = "FAILED"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    WORDPRESS_SYNCED = "WORDPRESS_SYNCED"

class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    category = Column(String(100), index=True, nullable=True) # Macro, Stock, Crypto, etc.
    score = Column(Float, default=0.0)
    detected_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="DISCOVERED")
    user_prompt = Column(Text, nullable=True)
    angle = Column(Text, nullable=True)
    
    articles = relationship("GeneratedArticle", back_populates="topic")
    sources = relationship("Source", back_populates="topic")

class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    url = Column(Text, unique=False)
    title = Column(String(500))
    publisher = Column(String(100))
    published_at = Column(DateTime)
    description = Column(Text, nullable=True)
    source_type = Column(String(50)) # rss, gnews, market_data
    reliability = Column(Integer, default=2) # 1=official, 2=major, 3=industry, 4=social
    image_url = Column(String(500), nullable=True)
    author = Column(String(255), nullable=True)
    source_domain = Column(String(255), nullable=True)
    relevance_score = Column(Float, default=0.0)
    credibility_metadata = Column(JSON, nullable=True)
    
    topic = relationship("Topic", back_populates="sources")
    content_data = relationship("NewsContent", back_populates="source", uselist=False)
    embedding_data = relationship("NewsEmbedding", back_populates="source", uselist=False)
    articles = relationship("GeneratedArticle", secondary=article_sources, back_populates="sources")

class NewsContent(Base):
    __tablename__ = "news_contents"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), unique=True)
    full_content = Column(Text)
    cleaned_content = Column(Text)
    extracted_at = Column(DateTime, default=datetime.utcnow)
    
    source = relationship("Source", back_populates="content_data")

class NewsEmbedding(Base):
    __tablename__ = "news_embeddings"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), unique=True)
    embedding = Column(JSON) # Store as JSON array of floats for simplicity if pgvector is not setup
    model_name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    source = relationship("Source", back_populates="embedding_data")

class GeneratedArticle(Base):
    __tablename__ = "generated_articles"
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    title = Column(String(500))
    subtitle = Column(Text, nullable=True)
    content = Column(Text)
    category = Column(String(100), nullable=True)
    author = Column(String(100), default="Inpartner")
    reading_time = Column(Integer, default=5)
    hero_image_url = Column(String(500), nullable=True)
    hero_image_caption = Column(String(500), nullable=True)
    images_metadata = Column(JSON, nullable=True)
    content_blocks = Column(JSON, nullable=True)
    user_prompt = Column(Text, nullable=True)
    seo_metadata = Column(JSON, nullable=True)
    research_metadata = Column(JSON, nullable=True)
    translations = Column(JSON, nullable=True)
    citations = Column(JSON, nullable=True)
    status = Column(SqlEnum(ArticleStatus), default=ArticleStatus.RESEARCHING)
    generation_step = Column(String(100), default="COMPLETED")
    error_message = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    
    # WordPress integration sync fields
    wordpress_post_id = Column(Integer, nullable=True)
    wordpress_site = Column(String(255), nullable=True)
    wordpress_status = Column(String(50), default="Not Published")
    last_synced_at = Column(DateTime, nullable=True)
    sync_status = Column(String(100), nullable=True)
    
    # Advanced SEO & Readability Assessment fields
    focus_keyphrase = Column(String(255), nullable=True)
    seo_score = Column(Integer, nullable=True)
    readability_score = Column(Integer, nullable=True)
    seo_status = Column(String(20), default="NOT_ASSESSED")
    readability_status = Column(String(20), default="NOT_ASSESSED")
    last_optimized_at = Column(DateTime, nullable=True)
    optimization_status = Column(String(50), default="ORIGINAL")
    
    topic = relationship("Topic", back_populates="articles")
    claims = relationship("Claim", back_populates="article")
    sources = relationship("Source", secondary=article_sources, back_populates="articles")
    editorial_correction = relationship("EditorialCorrection", back_populates="article", uselist=False)
    audits = relationship("ArticleAudit", back_populates="article", cascade="all, delete-orphan")
    revisions = relationship("ArticleRevision", back_populates="article", cascade="all, delete-orphan")
    wordpress_sync_logs = relationship("WordPressSyncLog", back_populates="article", cascade="all, delete-orphan")

class EditorialCorrection(Base):
    __tablename__ = "editorial_corrections"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("generated_articles.id"), unique=True)
    original_draft = Column(Text)
    corrected_content = Column(Text)
    correction_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    article = relationship("GeneratedArticle", back_populates="editorial_correction")

class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("generated_articles.id"))
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    claim_text = Column(Text)
    evidence = Column(Text)
    publisher = Column(String(255), nullable=True)
    url = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=True)
    verified = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)
    
    article = relationship("GeneratedArticle", back_populates="claims")
    source = relationship("Source")

class DailyGeneration(Base):
    __tablename__ = "daily_generation"
    date = Column(Date, primary_key=True)
    limit = Column(Integer, default=5)
    generated = Column(Integer, default=0)
    remaining = Column(Integer, default=5)

class SystemConfig(Base):
    __tablename__ = "system_config"
    key = Column(String(100), primary_key=True)
    value = Column(String(255))
    is_active = Column(Boolean, default=True)


class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    role = Column(String(50), default="admin", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)


class AutomationSetting(Base):
    __tablename__ = "automation_settings"
    id = Column(Integer, primary_key=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    schedule_hour = Column(Integer, default=8, nullable=False)
    schedule_minute = Column(Integer, default=0, nullable=False)
    timezone = Column(String(50), default="Asia/Jakarta", nullable=False)
    articles_per_day = Column(Integer, default=5, nullable=False)
    selected_topics = Column(JSON, nullable=True)  # List of strings e.g. ["Global Markets", ...]
    topic_strategy = Column(String(50), default="round_robin", nullable=False)  # round_robin, random, trending_score
    language = Column(String(20), default="English", nullable=False)
    target_audience = Column(String(100), default="Decision Makers", nullable=False)
    writing_style = Column(String(100), default="Analytical & Executive", nullable=False)
    article_length = Column(String(50), default="Medium (~1200 words)", nullable=False)
    direct_publish_wp = Column(Boolean, default=False, nullable=False)
    wp_url = Column(String(255), nullable=True)
    wp_username = Column(String(100), nullable=True)
    wp_app_password = Column(String(255), nullable=True)
    wp_category_id = Column(Integer, nullable=True)
    wp_author_id = Column(Integer, nullable=True)
    ga4_property_id = Column(String(100), nullable=True)
    ga4_credentials_json = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ArticleTopic(Base):
    __tablename__ = "article_topics"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)  # Finance, Business, Tech & AI, Economy, Custom
    is_preset = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AutomationExecution(Base):
    __tablename__ = "automation_executions"
    id = Column(Integer, primary_key=True, index=True)
    trigger_type = Column(String(50), default="SCHEDULED", nullable=False)  # SCHEDULED, MANUAL_RUN
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, RUNNING, SUCCESS, PARTIAL_SUCCESS, FAILED
    topics_processed = Column(JSON, nullable=True)
    articles_requested = Column(Integer, default=5, nullable=False)
    articles_succeeded = Column(Integer, default=0, nullable=False)
    articles_failed = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    summary_notes = Column(Text, nullable=True)

    items = relationship("AutomationExecutionItem", back_populates="execution", cascade="all, delete-orphan")


class AutomationExecutionItem(Base):
    __tablename__ = "automation_execution_items"
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("automation_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    article_id = Column(Integer, ForeignKey("generated_articles.id", ondelete="SET NULL"), nullable=True, index=True)
    topic_title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)  # SUCCESS, FAILED, SKIPPED
    error_message = Column(Text, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    execution = relationship("AutomationExecution", back_populates="items")
    article = relationship("GeneratedArticle")


class ArticleAnalyticsDaily(Base):
    __tablename__ = "article_analytics_daily"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("generated_articles.id", ondelete="SET NULL"), nullable=True, index=True)
    wordpress_post_id = Column(Integer, nullable=True, index=True)
    article_title = Column(String(500), nullable=True)
    date = Column(Date, nullable=False, index=True)
    pageviews = Column(Integer, default=0, nullable=False)
    unique_visitors = Column(Integer, default=0, nullable=False)
    clicks = Column(Integer, default=0, nullable=False)
    avg_engagement_time = Column(Float, default=0.0, nullable=False)
    engagement_rate = Column(Float, default=0.0, nullable=False)
    source = Column(String(50), default="internal", nullable=False)  # ga4, wordpress, internal
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    article = relationship("GeneratedArticle")


class AnalyticsSyncLog(Base):
    __tablename__ = "analytics_sync_logs"
    id = Column(Integer, primary_key=True, index=True)
    sync_type = Column(String(50), nullable=False)  # wordpress_metadata, ga4, click_aggregate
    status = Column(String(50), default="SUCCESS", nullable=False)
    records_synced = Column(Integer, default=0, nullable=False)
    message = Column(Text, nullable=True)
    synced_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ArticleTrackingEvent(Base):
    __tablename__ = "article_tracking_events"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, nullable=True, index=True)
    wordpress_post_id = Column(Integer, nullable=True, index=True)
    event_type = Column(String(50), nullable=False)  # view, click, reading_heartbeat
    reading_seconds = Column(Integer, default=0, nullable=False)
    session_id = Column(String(100), nullable=True, index=True)
    ip_hash = Column(String(64), nullable=True)
    referrer = Column(String(500), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ArticleAudit(Base):
    __tablename__ = "article_audits"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("generated_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    evaluator_version = Column(String(50), default="yoast-compatible-v1.0", nullable=False)
    audited_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    focus_keyphrase = Column(String(255), nullable=True)
    seo_score = Column(Integer, default=0, nullable=False)
    readability_score = Column(Integer, default=0, nullable=False)
    seo_status = Column(String(20), default="poor", nullable=False)  # good, ok, poor
    readability_status = Column(String(20), default="poor", nullable=False)  # good, ok, poor
    metrics = Column(JSON, nullable=True)
    issues = Column(JSON, nullable=True)
    is_latest = Column(Boolean, default=True, nullable=False)

    article = relationship("GeneratedArticle", back_populates="audits")

    @property
    def readability_details(self):
        return (self.metrics or {}).get("readability", {})

    @property
    def seo_details(self):
        return (self.metrics or {}).get("seo", {})


class ArticleRevision(Base):
    __tablename__ = "article_revisions"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("generated_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_number = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    source_type = Column(String(50), default="ai_optimization", nullable=False)  # ai_optimization, manual_edit, initial_generation, rollback
    title = Column(String(500), nullable=False)
    subtitle = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    seo_metadata = Column(JSON, nullable=True)
    change_summary = Column(Text, nullable=True)
    status = Column(String(50), default="pending_review", nullable=False)  # pending_review, accepted, rejected, archived
    diff_data = Column(JSON, nullable=True)
    audit_snapshot = Column(JSON, nullable=True)

    article = relationship("GeneratedArticle", back_populates="revisions")


class WordPressSyncLog(Base):
    __tablename__ = "wordpress_sync_logs"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("generated_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    wordpress_post_id = Column(Integer, nullable=True, index=True)
    synced_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sync_type = Column(String(50), default="initial_publish", nullable=False)  # initial_publish, re_sync_update, re_sync_seo
    status = Column(String(50), default="SUCCESS", nullable=False)  # SUCCESS, FAILED
    response_code = Column(Integer, nullable=True)
    changes_applied = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    article = relationship("GeneratedArticle", back_populates="wordpress_sync_logs")


