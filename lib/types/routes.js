/** 浏览器侧 API 前缀。 */
export const STATUS_API_PREFIX = '/api/devquest';
/** 读取 POST JSON body（小请求，最多 4MB——导入存档可能较大）。 */
function readBody(req, max = 4 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            if (data.length > max) {
                reject(new Error('body-too-large'));
                req.destroy();
            }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}
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
    /** POST 无 body 路由工厂：写成功即失效缓存。 */
    const post = (path, run) => ({
        kind: 'exact',
        path,
        handler: (req, res) => {
            if (req.method !== 'POST') {
                json(res, 405, { ok: false, error: 'method-not-allowed' });
                return;
            }
            run().then((result) => {
                invalidateCache();
                json(res, 200, result);
            }, (error) => json(res, 500, {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            }));
        },
    });
    /** POST + JSON body 路由工厂：parse 校验并取出参数；返回 null 时 400。 */
    const postJson = (path, parse, run, options = {}) => ({
        kind: 'exact',
        path,
        handler: (req, res) => {
            if (req.method !== 'POST') {
                json(res, 405, { ok: false, error: 'method-not-allowed' });
                return;
            }
            readBody(req, options.maxBytes).then(bodyText => {
                let raw;
                try {
                    raw = JSON.parse(bodyText);
                }
                catch {
                    json(res, 400, { ok: false, error: 'invalid-json' });
                    return undefined;
                }
                const arg = parse(raw);
                if (arg === null) {
                    json(res, 400, { ok: false, error: options.badRequestError ?? 'invalid-request' });
                    return undefined;
                }
                return run(arg).then((result) => {
                    invalidateCache();
                    json(res, 200, result);
                });
            }).then(undefined, (error) => json(res, 500, {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            }));
        },
    });
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
            path: `${STATUS_API_PREFIX}/export`,
            handler: (req, res) => {
                if (req.method !== 'GET') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.exportSave().then((data) => {
                    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="devquest-player.json"' });
                    res.end(JSON.stringify(data, null, 2));
                }, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/ui-settings`,
            handler: (req, res) => {
                if (req.method !== 'GET') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.uiSettings().then((settings) => json(res, 200, { ok: true, settings }), (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        },
        // ---- 无 body 的写操作 ----
        post(`${STATUS_API_PREFIX}/claim-chest`, () => config.claimChest()),
        post(`${STATUS_API_PREFIX}/shop/reroll`, () => config.reroll()),
        post(`${STATUS_API_PREFIX}/lucky`, () => config.lucky()),
        post(`${STATUS_API_PREFIX}/daily-goal/claim`, () => config.claimDailyGoal()),
        post(`${STATUS_API_PREFIX}/weekly-boss/claim`, () => config.claimWeeklyBoss()),
        post(`${STATUS_API_PREFIX}/weekly-bonus`, () => config.claimWeeklyBonus()),
        post(`${STATUS_API_PREFIX}/shop/quest-skip`, () => config.useQuestSkip()),
        // ---- 带 JSON body 的写操作 ----
        // 导入存档（更大体积限制）。
        postJson(`${STATUS_API_PREFIX}/import`, (raw) => raw, // 原样传（结构校验在 importSave 内）
        (raw) => config.importSave(raw), { maxBytes: 16 * 1024 * 1024 }),
        // shop/buy: { itemId: string }（空 → 400）。
        postJson(`${STATUS_API_PREFIX}/shop/buy`, (raw) => {
            const itemId = raw?.itemId;
            return typeof itemId === 'string' && itemId !== '' ? itemId : null;
        }, (itemId) => config.buy(itemId), { badRequestError: 'invalid-item-id' }),
        // titles/switch: { titleId: string }（空串合法 = 跟随等级）。
        postJson(`${STATUS_API_PREFIX}/titles/switch`, (raw) => {
            const titleId = raw?.titleId;
            return typeof titleId === 'string' ? titleId : null;
        }, (titleId) => config.setTitle(titleId)),
        // shop/theme: { themeId: string }（空串合法 = 默认主题）。
        postJson(`${STATUS_API_PREFIX}/shop/theme`, (raw) => {
            const themeId = raw?.themeId;
            return typeof themeId === 'string' ? themeId : null;
        }, (themeId) => config.setTheme(themeId)),
        // daily-goal/set: { goal: number }（0 = 关闭；缺省 0）。
        postJson(`${STATUS_API_PREFIX}/daily-goal/set`, (raw) => {
            const goal = raw?.goal;
            return typeof goal === 'number' ? goal : 0;
        }, (goal) => config.setDailyGoal(goal)),
        // pass/claim: { tierId: string }（空 → 400）。
        postJson(`${STATUS_API_PREFIX}/pass/claim`, (raw) => {
            const tierId = raw?.tierId;
            return typeof tierId === 'string' && tierId !== '' ? tierId : null;
        }, (tierId) => config.claimPass(tierId), { badRequestError: 'invalid-tier-id' }),
        // ui-settings: 整体替换（sanitize 在 host 侧）。
        postJson(`${STATUS_API_PREFIX}/ui-settings`, (raw) => raw, (raw) => config.saveUiSettings(raw)),];
}
