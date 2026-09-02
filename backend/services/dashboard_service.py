from psycopg2.extensions import connection
from psycopg2.extras import RealDictCursor

from utils.cache import cached


@cached(ttl_seconds=60)
def get_shop_stats(conn: connection) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) AS total_orders,
                COALESCE(
                    SUM(total_cents) FILTER (WHERE status != 'cancelled'),
                    0
                ) AS total_revenue_cents,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
                COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders
            FROM orders
            """
        )

        stats = cur.fetchone()

    return stats


@cached(ttl_seconds=60)
def get_dashboard_events(conn: connection) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                title,
                venue,
                event_date,
                status
            FROM events
            WHERE event_date = CURRENT_DATE
            ORDER BY start_time
            """
        )

        today = cur.fetchall()

        cur.execute(
            """
            SELECT
                id,
                title,
                venue,
                event_date,
                status
            FROM events
            WHERE event_date > CURRENT_DATE
            ORDER BY event_date
            LIMIT 5
            """
        )

        upcoming = cur.fetchall()

    return {
        "today": today,
        "upcoming": upcoming,
    }


@cached(ttl_seconds=60)
def get_recent_volunteer_uploads(conn: connection) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                hs.id,
                hs.name,
                hs.status,
                hs.image_url,
                hs.created_at,
                u.full_name AS submitted_by
            FROM heritage_sites hs
            LEFT JOIN users u
                ON hs.submitted_by = u.id
            WHERE hs.submitted_by IS NOT NULL
            ORDER BY hs.created_at DESC
            LIMIT 5
            """
        )

        uploads = cur.fetchall()

    return {
        "uploads": uploads,
    }


@cached(ttl_seconds=60)
def get_member_stats(conn: connection) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE is_active) AS total_members,
                COUNT(*) FILTER (
                    WHERE is_active AND created_at >= now() - interval '7 days'
                ) AS new_this_week
            FROM users
            """
        )

        return cur.fetchone()


@cached(ttl_seconds=60)
def get_sales_trend(conn: connection, months: int) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                to_char(month_start, 'YYYY-MM') AS month,
                COALESCE(
                    SUM(o.total_cents) FILTER (WHERE o.status != 'cancelled'),
                    0
                ) AS total_cents
            FROM generate_series(
                date_trunc('month', now()) - (%(months)s - 1) * interval '1 month',
                date_trunc('month', now()),
                interval '1 month'
            ) AS month_start
            LEFT JOIN orders o
                ON date_trunc('month', o.placed_at) = month_start
            GROUP BY month_start
            ORDER BY month_start
            """,
            {"months": months},
        )

        return {"points": cur.fetchall()}