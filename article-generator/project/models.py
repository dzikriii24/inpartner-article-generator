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
    author = Column(String(100), default="AI Editorial Board")
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
    
    topic = relationship("Topic", back_populates="articles")
    claims = relationship("Claim", back_populates="article")
    sources = relationship("Source", secondary=article_sources, back_populates="articles")
    editorial_correction = relationship("EditorialCorrection", back_populates="article", uselist=False)

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
