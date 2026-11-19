import { HttpError } from './errors.mjs';

async function githubRequest(url, token, options = {}) {
  try {
    return await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2026-03-10',
        ...options.headers,
      },
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new HttpError(502, '未能取得 GitHub 响应，请在仓库中确认发布状态。');
  }
}

async function githubFileExists(url, branch, token) {
  const lookup = new URL(url);
  if (branch) lookup.searchParams.set('ref', branch);
  const response = await githubRequest(lookup, token, {
    headers: { Accept: 'application/vnd.github.object+json' },
  });
  await response.body?.cancel().catch(() => {});
  return response.ok;
}

export async function publishMonthOnGitHub({ repository, branch, token }, month, content) {
  const url = `https://api.github.com/repos/${repository}/contents/data/months/${month}.geojson`;
  const request = {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Publish monthly GIS data for ${month}`,
      content,
      branch: branch || undefined,
    }),
  };

  for (let attempt = 0; ; attempt++) {
    // Omitting sha makes the request create-only even if the same month is published concurrently.
    const response = await githubRequest(url, token, request);
    if (response.status === 201) {
      const result = await response.json().catch(() => null);
      if (!result?.commit?.sha) {
        throw new HttpError(502, 'GitHub 已接收发布请求，请在仓库中确认提交结果。');
      }
      return { commit: result.commit.sha, commitUrl: result.commit.html_url };
    }

    await response.body?.cancel().catch(() => {});
    const status = response.status;
    if (status === 401) throw new HttpError(401, 'GitHub 令牌无效或已过期。');
    if (status === 403 || status === 404) {
      throw new HttpError(502, 'GitHub 拒绝发布。请确认令牌已为目标仓库授予 Contents 读写权限。');
    }
    if (status === 409 || status === 422) {
      if (await githubFileExists(url, branch, token)) throw new HttpError(409, '该月份已经发布。');
      // A concurrent commit for a different month can move the branch between GitHub's checks.
      if (status === 409 && attempt === 0) continue;
    }
    throw new HttpError(502, `GitHub 发布失败（HTTP ${status}）。请检查仓库、分支和发布令牌权限。`);
  }
}
