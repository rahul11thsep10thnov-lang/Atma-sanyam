import { sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';

// All dates are UTC calendar days (the database session timezone).

async function rows<T>(db: Db, query: ReturnType<typeof sql>): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

async function one<T>(db: Db, query: ReturnType<typeof sql>): Promise<T> {
  return (await rows<T>(db, query))[0]!;
}

export async function dashboardStats(db: Db) {
  const counts = await one<{
    total_users: number;
    active_users_7d: number;
    new_users_7d: number;
    total_installs: number;
    new_installs_7d: number;
    active_installs_7d: number;
    content_total: number;
    content_published: number;
    content_draft: number;
    categories: number;
    sessions_completed_7d: number;
    sessions_failed_7d: number;
    notifications_sent_30d: number;
  }>(
    db,
    sql`select
      (select count(*) from users)::int as total_users,
      (select count(*) from users where status = 'active' and last_seen_at >= now() - interval '7 days')::int as active_users_7d,
      (select count(*) from users where created_at >= now() - interval '7 days')::int as new_users_7d,
      (select count(*) from devices)::int as total_installs,
      (select count(*) from devices where created_at >= now() - interval '7 days')::int as new_installs_7d,
      (select count(distinct install_id) from events where occurred_at >= now() - interval '7 days')::int as active_installs_7d,
      (select count(*) from content)::int as content_total,
      (select count(*) from content where status = 'published')::int as content_published,
      (select count(*) from content where status = 'draft')::int as content_draft,
      (select count(*) from categories)::int as categories,
      (select count(*) from events where name = 'session_complete' and occurred_at >= now() - interval '7 days')::int as sessions_completed_7d,
      (select count(*) from events where name = 'session_fail' and occurred_at >= now() - interval '7 days')::int as sessions_failed_7d,
      (select count(*) from notifications where status = 'sent' and sent_at >= now() - interval '30 days')::int as notifications_sent_30d`
  );
  return {
    users: { total: counts.total_users, active7d: counts.active_users_7d, new7d: counts.new_users_7d },
    installs: { total: counts.total_installs, new7d: counts.new_installs_7d, active7d: counts.active_installs_7d },
    content: {
      total: counts.content_total,
      published: counts.content_published,
      draft: counts.content_draft,
      categories: counts.categories,
    },
    sessions7d: { completed: counts.sessions_completed_7d, failed: counts.sessions_failed_7d },
    notificationsSent30d: counts.notifications_sent_30d,
  };
}

export async function recentAuditLog(db: Db, limit = 10) {
  return rows<{ id: number; action: string; entity_type: string; entity_id: string | null; created_at: string; admin_name: string | null }>(
    db,
    sql`select l.id, l.action, l.entity_type, l.entity_id, l.created_at, a.name as admin_name
        from audit_logs l left join admins a on a.id = l.admin_id
        order by l.created_at desc limit ${limit}`
  );
}

export async function recentUsers(db: Db, limit = 5) {
  return rows<{ id: string; email: string; display_name: string | null; created_at: string }>(
    db,
    sql`select id, email, display_name, created_at from users order by created_at desc limit ${limit}`
  );
}

export async function analytics(db: Db, days: number) {
  const since = sql`(current_date - ${days - 1}::int)`;

  const dau = await rows<{ date: string; count: number }>(
    db,
    sql`with d as (select generate_series(${since}, current_date, interval '1 day')::date as day)
        select to_char(d.day, 'YYYY-MM-DD') as date, count(distinct e.install_id)::int as count
        from d left join events e on e.occurred_at >= d.day and e.occurred_at < d.day + 1
        group by d.day order by d.day`
  );

  const registrations = await rows<{ date: string; count: number }>(
    db,
    sql`with d as (select generate_series(${since}, current_date, interval '1 day')::date as day)
        select to_char(d.day, 'YYYY-MM-DD') as date, count(u.id)::int as count
        from d left join users u on u.created_at >= d.day and u.created_at < d.day + 1
        group by d.day order by d.day`
  );

  const actives = await one<{ dau: number; wau: number; mau: number }>(
    db,
    sql`select
      (select count(distinct install_id) from events where occurred_at >= current_date)::int as dau,
      (select count(distinct install_id) from events where occurred_at >= now() - interval '7 days')::int as wau,
      (select count(distinct install_id) from events where occurred_at >= now() - interval '30 days')::int as mau`
  );

  // Classic day-N retention: of installs first seen on day X, how many were
  // active again exactly N days later. Only cohorts old enough are counted.
  const retention = await one<Record<string, number>>(
    db,
    sql`with first_seen as (
          select install_id, min(occurred_at)::date as cohort from events group by install_id
        ),
        activity as (
          select distinct install_id, occurred_at::date as day from events
          where occurred_at >= current_date - ${days + 31}::int
        )
        select
          count(*) filter (where cohort <= current_date - 1)::int as eligible_d1,
          count(*) filter (where cohort <= current_date - 1 and exists (
            select 1 from activity a where a.install_id = f.install_id and a.day = f.cohort + 1))::int as retained_d1,
          count(*) filter (where cohort <= current_date - 7)::int as eligible_d7,
          count(*) filter (where cohort <= current_date - 7 and exists (
            select 1 from activity a where a.install_id = f.install_id and a.day = f.cohort + 7))::int as retained_d7,
          count(*) filter (where cohort <= current_date - 30)::int as eligible_d30,
          count(*) filter (where cohort <= current_date - 30 and exists (
            select 1 from activity a where a.install_id = f.install_id and a.day = f.cohort + 30))::int as retained_d30
        from first_seen f
        where f.cohort >= ${since}`
  );
  const rate = (r: number | undefined, e: number | undefined) => (e ? Math.round((1000 * (r ?? 0)) / e) / 10 : null);

  const topScreens = await rows<{ screen: string; views: number }>(
    db,
    sql`select screen, count(*)::int as views from events
        where name = 'screen_view' and screen is not null and occurred_at >= ${since}
        group by screen order by views desc limit 10`
  );

  const topContent = await rows<{ content_id: string; title: string | null; views: number }>(
    db,
    sql`select e.content_id, c.title, count(*)::int as views
        from events e left join content c on c.id::text = e.content_id
        where e.name = 'content_view' and e.content_id is not null and e.occurred_at >= ${since}
        group by e.content_id, c.title order by views desc limit 10`
  );

  const sessions = await one<{ completed: number; failed: number; avg_minutes: number | null }>(
    db,
    sql`select
      count(*) filter (where name = 'session_complete')::int as completed,
      count(*) filter (where name = 'session_fail')::int as failed,
      round(avg((properties->>'durationMinutes')::numeric) filter (
        where name = 'session_complete' and properties->>'durationMinutes' ~ '^[0-9]+$'), 1)::float as avg_minutes
      from events where occurred_at >= ${since} and name in ('session_complete', 'session_fail')`
  );

  const platforms = await rows<{ platform: string | null; installs: number }>(
    db,
    sql`select platform, count(distinct install_id)::int as installs from events
        where occurred_at >= ${since} group by platform order by installs desc`
  );

  const errors = await rows<{ message: string | null; platform: string | null; app_version: string | null; occurred_at: string }>(
    db,
    sql`select left(properties->>'message', 300) as message, platform, app_version, occurred_at from events
        where name = 'error' and occurred_at >= ${since} order by occurred_at desc limit 20`
  );
  const errorCount = await one<{ n: number }>(
    db,
    sql`select count(*)::int as n from events where name = 'error' and occurred_at >= ${since}`
  );

  const total = sessions.completed + sessions.failed;
  return {
    days,
    active: actives,
    dau,
    registrations,
    retention: {
      d1: rate(retention.retained_d1, retention.eligible_d1),
      d7: rate(retention.retained_d7, retention.eligible_d7),
      d30: rate(retention.retained_d30, retention.eligible_d30),
      cohortSizes: { d1: retention.eligible_d1, d7: retention.eligible_d7, d30: retention.eligible_d30 },
    },
    topScreens,
    topContent,
    sessions: {
      completed: sessions.completed,
      failed: sessions.failed,
      completionRate: total ? Math.round((1000 * sessions.completed) / total) / 10 : null,
      avgCompletedMinutes: sessions.avg_minutes,
    },
    platforms,
    errors: { count: errorCount.n, recent: errors },
  };
}
