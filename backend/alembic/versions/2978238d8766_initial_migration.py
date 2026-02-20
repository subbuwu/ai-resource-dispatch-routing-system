"""Initial migration: PostGIS + users, requesters, relief_centers, relief_requests, etc.

Revision ID: 2978238d8766
Revises:
Create Date: 2026-02-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "2978238d8766"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    op.create_table(
        "relief_centers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_relief_centers_id"), "relief_centers", ["id"], unique=False)
    op.create_index(op.f("ix_relief_centers_name"), "relief_centers", ["name"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("VOLUNTEER", "ADMIN", name="userrole", create_type=True, native_enum=False),
            nullable=False,
        ),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "requesters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", sa.String(length=36), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_requesters_device_id"), "requesters", ["device_id"], unique=True)
    op.create_index(op.f("ix_requesters_id"), "requesters", ["id"], unique=False)

    op.create_table(
        "relief_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requester_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relief_centre_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_type", sa.String(length=255), nullable=False),
        sa.Column("supplies", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("urgency_level", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING",
                "ACCEPTED",
                "IN_PROGRESS",
                "COMPLETED",
                name="reliefrequeststatus",
                create_type=True,
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("urgency_level >= 1 AND urgency_level <= 5", name="check_urgency_level"),
        sa.ForeignKeyConstraint(["requester_id"], ["requesters.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["relief_centre_id"], ["relief_centers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_relief_requests_created_at"), "relief_requests", ["created_at"], unique=False
    )
    op.create_index(op.f("ix_relief_requests_id"), "relief_requests", ["id"], unique=False)
    op.create_index(
        op.f("ix_relief_requests_relief_centre_id"),
        "relief_requests",
        ["relief_centre_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_relief_requests_requester_id"), "relief_requests", ["requester_id"], unique=False
    )
    op.create_index(op.f("ix_relief_requests_status"), "relief_requests", ["status"], unique=False)
    op.create_index(
        op.f("ix_relief_requests_urgency_level"),
        "relief_requests",
        ["urgency_level"],
        unique=False,
    )

    op.create_table(
        "volunteer_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relief_center_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vehicle_type", sa.String(length=100), nullable=True),
        sa.Column(
            "availability_status",
            sa.Enum(
                "AVAILABLE",
                "BUSY",
                name="availabilitystatus",
                create_type=True,
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["relief_center_id"], ["relief_centers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_volunteer_profiles_availability_status"),
        "volunteer_profiles",
        ["availability_status"],
        unique=False,
    )
    op.create_index(op.f("ix_volunteer_profiles_id"), "volunteer_profiles", ["id"], unique=False)
    op.create_index(
        op.f("ix_volunteer_profiles_relief_center_id"),
        "volunteer_profiles",
        ["relief_center_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_volunteer_profiles_user_id"), "volunteer_profiles", ["user_id"], unique=False
    )

    op.create_table(
        "dispatches",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("volunteer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING",
                "ASSIGNED",
                "IN_PROGRESS",
                "COMPLETED",
                "CANCELLED",
                name="dispatchstatus",
                create_type=True,
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["request_id"], ["relief_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["volunteer_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_dispatches_assigned_at"), "dispatches", ["assigned_at"], unique=False)
    op.create_index(op.f("ix_dispatches_id"), "dispatches", ["id"], unique=False)
    op.create_index(op.f("ix_dispatches_request_id"), "dispatches", ["request_id"], unique=False)
    op.create_index(op.f("ix_dispatches_status"), "dispatches", ["status"], unique=False)
    op.create_index(
        op.f("ix_dispatches_volunteer_id"), "dispatches", ["volunteer_id"], unique=False
    )

    op.create_table(
        "routes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dispatch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "geometry",
            geoalchemy2.types.Geometry(geometry_type="LINESTRING", srid=4326),
            nullable=False,
        ),
        sa.Column("distance", sa.Float(), nullable=False),
        sa.Column("duration", sa.Float(), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["dispatch_id"], ["dispatches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_route_geometry", "routes", ["geometry"], unique=False, postgresql_using="gist"
    )
    op.create_index(op.f("ix_routes_dispatch_id"), "routes", ["dispatch_id"], unique=False)
    op.create_index(op.f("ix_routes_id"), "routes", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_routes_id"), table_name="routes")
    op.drop_index(op.f("ix_routes_dispatch_id"), table_name="routes")
    op.drop_index("idx_route_geometry", table_name="routes", postgresql_using="gist")
    op.drop_table("routes")

    op.drop_index(op.f("ix_dispatches_volunteer_id"), table_name="dispatches")
    op.drop_index(op.f("ix_dispatches_status"), table_name="dispatches")
    op.drop_index(op.f("ix_dispatches_request_id"), table_name="dispatches")
    op.drop_index(op.f("ix_dispatches_id"), table_name="dispatches")
    op.drop_index(op.f("ix_dispatches_assigned_at"), table_name="dispatches")
    op.drop_table("dispatches")

    op.drop_index(op.f("ix_volunteer_profiles_user_id"), table_name="volunteer_profiles")
    op.drop_index(
        op.f("ix_volunteer_profiles_relief_center_id"), table_name="volunteer_profiles"
    )
    op.drop_index(op.f("ix_volunteer_profiles_id"), table_name="volunteer_profiles")
    op.drop_index(
        op.f("ix_volunteer_profiles_availability_status"), table_name="volunteer_profiles"
    )
    op.drop_table("volunteer_profiles")

    op.drop_index(op.f("ix_relief_requests_urgency_level"), table_name="relief_requests")
    op.drop_index(op.f("ix_relief_requests_status"), table_name="relief_requests")
    op.drop_index(op.f("ix_relief_requests_requester_id"), table_name="relief_requests")
    op.drop_index(op.f("ix_relief_requests_relief_centre_id"), table_name="relief_requests")
    op.drop_index(op.f("ix_relief_requests_id"), table_name="relief_requests")
    op.drop_index(op.f("ix_relief_requests_created_at"), table_name="relief_requests")
    op.drop_table("relief_requests")

    op.drop_index(op.f("ix_requesters_id"), table_name="requesters")
    op.drop_index(op.f("ix_requesters_device_id"), table_name="requesters")
    op.drop_table("requesters")

    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_relief_centers_name"), table_name="relief_centers")
    op.drop_index(op.f("ix_relief_centers_id"), table_name="relief_centers")
    op.drop_table("relief_centers")

    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="reliefrequeststatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="availabilitystatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="dispatchstatus").drop(op.get_bind(), checkfirst=True)
