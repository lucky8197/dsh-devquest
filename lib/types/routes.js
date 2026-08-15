/** 浏览器侧 API 前缀。 */
export const STATUS_API_PREFIX = '/api/devquest';
/** 写 JSON 响应。 */
function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}
/** 从查询字符串取单个参数（URL 解码；重复取首个）。 */
function parseQueryParam(url, key) {
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    for (const part of query.split('&')) {
        if (!part.startsWith(`${key}=`))
            continue;
        try {
            return decodeURIComponent(part.slice(key.length + 1));
        }
        catch {
            return undefined;
        }
    }
    return undefined;
}
/**
 * 解析状态归属目录：显式 cwd > session 参数 > 最近活跃会话的 cwd
 * > defaultCwd > 进程 cwd。最近活跃 = 会话列表里 seq 最大者（事件最新）。
 */
function resolveCwd(url, config) {
    const explicit = parseQueryParam(url, 'cwd');
    if (explicit !== undefined && explicit !== '')
        return explicit;
    const sessionId = parseQueryParam(url, 'session');
    if (sessionId !== undefined && sessionId !== '') {
        const session = config.sessions?.get(sessionId);
        if (session?.header.cwd !== undefined && session.header.cwd !== '') {
            return session.header.cwd;
        }
    }
    // 无参数：选最近活跃（seq 最大）且带 cwd 的会话。
    const sessions = config.sessions?.list();
    if (sessions !== undefined) {
        let best;
        let bestSeq = -1;
        for (const s of sessions) {
            const cwd = s.header.cwd;
            const seq = s.seq ?? 0;
            if (cwd !== undefined && cwd !== '' && seq >= bestSeq) {
                best = cwd;
                bestSeq = seq;
            }
        }
        if (best !== undefined)
            return best;
    }
    return config.defaultCwd ?? process.cwd();
}
/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
export function makeDevQuestRoutes(config) {
    const { cacheTtlMs = 60_000 } = config;
    const cache = new Map();
    const MAX_CACHE_ENTRIES = 32;
    const status = (cwd) => {
        const hit = cache.get(cwd);
        if (hit !== undefined && Date.now() - hit.at < cacheTtlMs)
            return hit.promise;
        if (cache.size >= MAX_CACHE_ENTRIES) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined)
                cache.delete(oldest);
        }
        const promise = config.status(cwd)
            .catch((error) => {
            cache.delete(cwd);
            throw error;
        });
        cache.set(cwd, { at: Date.now(), promise });
        return promise;
    };
    return [{
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/status`,
            handler: (req, res) => {
                if (req.method !== 'GET') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                const cwd = resolveCwd(req.url ?? '', config);
                status(cwd).then((result) => json(res, 200, { ok: true, status: result }), (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }];
}
