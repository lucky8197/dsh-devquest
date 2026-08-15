/** 浏览器侧 API 前缀。 */
export const STATUS_API_PREFIX = '/api/devquest';
/** 写 JSON 响应。 */
function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}
/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
export function makeDevQuestRoutes(config) {
    const { cacheTtlMs = 60_000 } = config;
    let cached;
    const invalidateCache = () => {
        cached = undefined;
    };
    const status = () => {
        if (cached !== undefined && Date.now() - cached.at < cacheTtlMs)
            return cached.promise;
        const promise = config.status().catch((error) => {
            cached = undefined;
            throw error;
        });
        cached = { at: Date.now(), promise };
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
                status().then((result) => json(res, 200, { ok: true, status: result }), (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/claim-chest`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.claimChest().then((result) => {
                    invalidateCache(); // 状态变了，失效缓存让下次轮询取到新值
                    json(res, 200, { ok: result.ok, gained: result.gained, status: result.status });
                }, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }];
}
