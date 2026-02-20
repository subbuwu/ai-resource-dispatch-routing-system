"""Add volunteer location to dispatches for live tracking

Revision ID: add_dispatch_loc
Revises: 2978238d8766
Create Date: 2026-02-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision = "add_dispatch_loc"
down_revision: Union[str, None] = "2978238d8766"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dispatches", sa.Column("volunteer_latitude", sa.Float(), nullable=True))
    op.add_column("dispatches", sa.Column("volunteer_longitude", sa.Float(), nullable=True))
    op.add_column("dispatches", sa.Column("location_updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("dispatches", "location_updated_at")
    op.drop_column("dispatches", "volunteer_longitude")
    op.drop_column("dispatches", "volunteer_latitude")
