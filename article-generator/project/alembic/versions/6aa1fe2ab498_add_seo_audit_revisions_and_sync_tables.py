"""add_seo_audit_revisions_and_sync_tables

Revision ID: 6aa1fe2ab498
Revises: 0d6bbba7748c
Create Date: 2026-10-15 12:06:36.105538

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6aa1fe2ab498'
down_revision: Union[str, Sequence[str], None] = '0d6bbba7748c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create article_audits table
    op.create_table(
        'article_audits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('evaluator_version', sa.String(length=50), nullable=False),
        sa.Column('audited_at', sa.DateTime(), nullable=False),
        sa.Column('focus_keyphrase', sa.String(length=255), nullable=True),
        sa.Column('seo_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('readability_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('seo_status', sa.String(length=20), nullable=False, server_default='poor'),
        sa.Column('readability_status', sa.String(length=20), nullable=False, server_default='poor'),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('issues', sa.JSON(), nullable=True),
        sa.Column('is_latest', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['article_id'], ['generated_articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_audits_article_id'), 'article_audits', ['article_id'], unique=False)
    op.create_index(op.f('ix_article_audits_id'), 'article_audits', ['id'], unique=False)

    # 2. Create article_revisions table
    op.create_table(
        'article_revisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('revision_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False, server_default='ai_optimization'),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('subtitle', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('seo_metadata', sa.JSON(), nullable=True),
        sa.Column('change_summary', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending_review'),
        sa.Column('diff_data', sa.JSON(), nullable=True),
        sa.Column('audit_snapshot', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['generated_articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_revisions_article_id'), 'article_revisions', ['article_id'], unique=False)
    op.create_index(op.f('ix_article_revisions_id'), 'article_revisions', ['id'], unique=False)

    # 3. Create wordpress_sync_logs table
    op.create_table(
        'wordpress_sync_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('wordpress_post_id', sa.Integer(), nullable=True),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.Column('sync_type', sa.String(length=50), nullable=False, server_default='initial_publish'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='SUCCESS'),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('changes_applied', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['generated_articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wordpress_sync_logs_article_id'), 'wordpress_sync_logs', ['article_id'], unique=False)
    op.create_index(op.f('ix_wordpress_sync_logs_id'), 'wordpress_sync_logs', ['id'], unique=False)
    op.create_index(op.f('ix_wordpress_sync_logs_wordpress_post_id'), 'wordpress_sync_logs', ['wordpress_post_id'], unique=False)

    # 4. Add SEO & Readability columns to generated_articles
    op.add_column('generated_articles', sa.Column('focus_keyphrase', sa.String(length=255), nullable=True))
    op.add_column('generated_articles', sa.Column('seo_score', sa.Integer(), nullable=True))
    op.add_column('generated_articles', sa.Column('readability_score', sa.Integer(), nullable=True))
    op.add_column('generated_articles', sa.Column('seo_status', sa.String(length=20), server_default='NOT_ASSESSED', nullable=True))
    op.add_column('generated_articles', sa.Column('readability_status', sa.String(length=20), server_default='NOT_ASSESSED', nullable=True))
    op.add_column('generated_articles', sa.Column('last_optimized_at', sa.DateTime(), nullable=True))
    op.add_column('generated_articles', sa.Column('optimization_status', sa.String(length=50), server_default='ORIGINAL', nullable=True))


def downgrade() -> None:
    op.drop_column('generated_articles', 'optimization_status')
    op.drop_column('generated_articles', 'last_optimized_at')
    op.drop_column('generated_articles', 'readability_status')
    op.drop_column('generated_articles', 'seo_status')
    op.drop_column('generated_articles', 'readability_score')
    op.drop_column('generated_articles', 'seo_score')
    op.drop_column('generated_articles', 'focus_keyphrase')

    op.drop_index(op.f('ix_wordpress_sync_logs_wordpress_post_id'), table_name='wordpress_sync_logs')
    op.drop_index(op.f('ix_wordpress_sync_logs_id'), table_name='wordpress_sync_logs')
    op.drop_index(op.f('ix_wordpress_sync_logs_article_id'), table_name='wordpress_sync_logs')
    op.drop_table('wordpress_sync_logs')

    op.drop_index(op.f('ix_article_revisions_id'), table_name='article_revisions')
    op.drop_index(op.f('ix_article_revisions_article_id'), table_name='article_revisions')
    op.drop_table('article_revisions')

    op.drop_index(op.f('ix_article_audits_id'), table_name='article_audits')
    op.drop_index(op.f('ix_article_audits_article_id'), table_name='article_audits')
    op.drop_table('article_audits')
