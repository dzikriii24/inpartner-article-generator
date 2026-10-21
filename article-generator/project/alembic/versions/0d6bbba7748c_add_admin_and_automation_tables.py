"""add_admin_and_automation_tables

Revision ID: 0d6bbba7748c
Revises: 51c2ec7d26bc
Create Date: 2026-10-14 11:15:47.040724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d6bbba7748c'
down_revision: Union[str, Sequence[str], None] = '51c2ec7d26bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'admin_users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=50), server_default='admin', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_users_id'), 'admin_users', ['id'], unique=False)
    op.create_index(op.f('ix_admin_users_username'), 'admin_users', ['username'], unique=True)

    op.create_table(
        'automation_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('schedule_hour', sa.Integer(), server_default='8', nullable=False),
        sa.Column('schedule_minute', sa.Integer(), server_default='0', nullable=False),
        sa.Column('timezone', sa.String(length=50), server_default='Asia/Jakarta', nullable=False),
        sa.Column('articles_per_day', sa.Integer(), server_default='5', nullable=False),
        sa.Column('selected_topics', sa.JSON(), nullable=True),
        sa.Column('topic_strategy', sa.String(length=50), server_default='round_robin', nullable=False),
        sa.Column('language', sa.String(length=20), server_default='English', nullable=False),
        sa.Column('target_audience', sa.String(length=100), server_default='Decision Makers', nullable=False),
        sa.Column('writing_style', sa.String(length=100), server_default='Analytical & Executive', nullable=False),
        sa.Column('article_length', sa.String(length=50), server_default='Medium (~1200 words)', nullable=False),
        sa.Column('direct_publish_wp', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('wp_url', sa.String(length=255), nullable=True),
        sa.Column('wp_username', sa.String(length=100), nullable=True),
        sa.Column('wp_app_password', sa.String(length=255), nullable=True),
        sa.Column('wp_category_id', sa.Integer(), nullable=True),
        sa.Column('wp_author_id', sa.Integer(), nullable=True),
        sa.Column('ga4_property_id', sa.String(length=100), nullable=True),
        sa.Column('ga4_credentials_json', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'article_topics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('is_preset', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_topics_id'), 'article_topics', ['id'], unique=False)
    op.create_index(op.f('ix_article_topics_name'), 'article_topics', ['name'], unique=False)
    op.create_index(op.f('ix_article_topics_category'), 'article_topics', ['category'], unique=False)

    op.create_table(
        'automation_executions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trigger_type', sa.String(length=50), server_default='SCHEDULED', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='PENDING', nullable=False),
        sa.Column('topics_processed', sa.JSON(), nullable=True),
        sa.Column('articles_requested', sa.Integer(), server_default='5', nullable=False),
        sa.Column('articles_succeeded', sa.Integer(), server_default='0', nullable=False),
        sa.Column('articles_failed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('started_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('summary_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_automation_executions_id'), 'automation_executions', ['id'], unique=False)

    op.create_table(
        'automation_execution_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('execution_id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=True),
        sa.Column('topic_title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='PENDING', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['execution_id'], ['automation_executions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['article_id'], ['generated_articles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_automation_execution_items_id'), 'automation_execution_items', ['id'], unique=False)
    op.create_index(op.f('ix_automation_execution_items_execution_id'), 'automation_execution_items', ['execution_id'], unique=False)
    op.create_index(op.f('ix_automation_execution_items_article_id'), 'automation_execution_items', ['article_id'], unique=False)

    op.create_table(
        'article_analytics_daily',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=True),
        sa.Column('wordpress_post_id', sa.Integer(), nullable=True),
        sa.Column('article_title', sa.String(length=500), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('pageviews', sa.Integer(), server_default='0', nullable=False),
        sa.Column('unique_visitors', sa.Integer(), server_default='0', nullable=False),
        sa.Column('clicks', sa.Integer(), server_default='0', nullable=False),
        sa.Column('avg_engagement_time', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('engagement_rate', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('source', sa.String(length=50), server_default='internal', nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['article_id'], ['generated_articles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_analytics_daily_id'), 'article_analytics_daily', ['id'], unique=False)
    op.create_index(op.f('ix_article_analytics_daily_article_id'), 'article_analytics_daily', ['article_id'], unique=False)
    op.create_index(op.f('ix_article_analytics_daily_wordpress_post_id'), 'article_analytics_daily', ['wordpress_post_id'], unique=False)
    op.create_index(op.f('ix_article_analytics_daily_date'), 'article_analytics_daily', ['date'], unique=False)

    op.create_table(
        'analytics_sync_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sync_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='SUCCESS', nullable=False),
        sa.Column('records_synced', sa.Integer(), server_default='0', nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('synced_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analytics_sync_logs_id'), 'analytics_sync_logs', ['id'], unique=False)

    op.create_table(
        'article_tracking_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=True),
        sa.Column('wordpress_post_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('reading_seconds', sa.Integer(), server_default='0', nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('referrer', sa.String(length=500), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_tracking_events_id'), 'article_tracking_events', ['id'], unique=False)
    op.create_index(op.f('ix_article_tracking_events_article_id'), 'article_tracking_events', ['article_id'], unique=False)
    op.create_index(op.f('ix_article_tracking_events_wordpress_post_id'), 'article_tracking_events', ['wordpress_post_id'], unique=False)
    op.create_index(op.f('ix_article_tracking_events_session_id'), 'article_tracking_events', ['session_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('article_tracking_events')
    op.drop_table('analytics_sync_logs')
    op.drop_table('article_analytics_daily')
    op.drop_table('automation_execution_items')
    op.drop_table('automation_executions')
    op.drop_table('article_topics')
    op.drop_table('automation_settings')
    op.drop_table('admin_users')
