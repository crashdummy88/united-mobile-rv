/**
 * Cloudflare Pages Function: GET /api/discussions
 * Pulls live GitHub Discussions threads for the public forum page via
 * GitHub's GraphQL API (Discussions has no REST endpoint).
 *
 * Requires Pages env var GITHUB_DISCUSSIONS_TOKEN — a fine-grained PAT
 * scoped ONLY to this repo, with "Discussions: Read-only" permission.
 * Never commit this token. Set it in Cloudflare Pages → Settings → Environment variables.
 */

const OWNER = 'crashdummy88';
const REPO = 'united-mobile-rv';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120', // 2 min edge cache — avoid hammering GitHub's API
      'Access-Control-Allow-Origin': '*',
    },
  });
}

const QUERY = `
  query($owner: String!, $name: String!, $first: Int!) {
    repository(owner: $owner, name: $name) {
      discussions(first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
        totalCount
        nodes {
          id
          number
          title
          url
          createdAt
          updatedAt
          comments { totalCount }
          author { login avatarUrl }
          category { name emoji }
        }
      }
    }
  }
`;

export async function onRequestGet(context) {
  const { env, request } = context;
  const token = (env.GITHUB_DISCUSSIONS_TOKEN || '').trim();

  if (!token) {
    return json(
      {
        success: false,
        error: 'not_configured',
        message: 'Discussions feed is not wired up yet.',
        fallback_url: `https://github.com/${OWNER}/${REPO}/discussions`,
      },
      503
    );
  }

  const url = new URL(request.url);
  const first = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${token}`,
        'User-Agent': 'umrt-forum-worker',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { owner: OWNER, name: REPO, first },
      }),
    });

    if (!res.ok) {
      return json(
        {
          success: false,
          error: 'upstream_error',
          status: res.status,
          fallback_url: `https://github.com/${OWNER}/${REPO}/discussions`,
        },
        502
      );
    }

    const data = await res.json();
    if (data.errors) {
      return json(
        {
          success: false,
          error: 'graphql_error',
          details: data.errors,
          fallback_url: `https://github.com/${OWNER}/${REPO}/discussions`,
        },
        502
      );
    }

    const nodes = data?.data?.repository?.discussions?.nodes || [];
    const threads = nodes.map((n) => ({
      id: n.id,
      number: n.number,
      title: n.title,
      url: n.url,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      commentCount: n.comments?.totalCount ?? 0,
      author: n.author?.login || 'unknown',
      authorAvatar: n.author?.avatarUrl || null,
      category: n.category?.name || 'General',
      categoryEmoji: n.category?.emoji || '',
    }));

    return json({
      success: true,
      totalCount: data?.data?.repository?.discussions?.totalCount ?? threads.length,
      threads,
    });
  } catch (err) {
    return json(
      {
        success: false,
        error: 'network',
        fallback_url: `https://github.com/${OWNER}/${REPO}/discussions`,
      },
      502
    );
  }
}
