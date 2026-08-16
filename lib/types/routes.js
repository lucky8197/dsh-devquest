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
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/shop/buy`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                readBody(req).then(body => {
                    let itemId = '';
                    try {
                        const parsed = JSON.parse(body);
                        if (typeof parsed.itemId === 'string')
                            itemId = parsed.itemId;
                    }
                    catch {
                        itemId = '';
                    }
                    if (itemId === '') {
                        json(res, 400, { ok: false, error: 'invalid-item-id' });
                        return undefined;
                    }
                    return config.buy(itemId).then((result) => {
                        invalidateCache();
                        json(res, 200, { ok: result.ok, reason: result.reason, status: result.status });
                    });
                }).then(undefined, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/shop/reroll`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.reroll().then((result) => {
                    invalidateCache();
                    json(res, 200, { ok: result.ok, status: result.status });
                }, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/lucky`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.lucky().then((result) => {
                    invalidateCache();
                    json(res, 200, { ok: result.ok, reward: result.reward, status: result.status });
                }, (error) => json(res, 500, {
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
            path: `${STATUS_API_PREFIX}/import`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                readBody(req, 16 * 1024 * 1024).then(body => {
                    let raw;
                    try {
                        raw = JSON.parse(body);
                    }
                    catch {
                        json(res, 400, { ok: false, error: 'invalid-json' });
                        return undefined;
                    }
                    return config.importSave(raw).then((result) => {
                        invalidateCache();
                        json(res, 200, { ok: result.ok, error: result.error, status: result.status });
                    });
                }).then(undefined, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/titles/switch`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                readBody(req).then(body => {
                    let titleId = '';
                    try {
                        const parsed = JSON.parse(body);
                        if (typeof parsed.titleId === 'string')
                            titleId = parsed.titleId;
                    }
                    catch {
                        titleId = '';
                    }
                    return config.setTitle(titleId).then((result) => {
                        invalidateCache();
                        json(res, 200, { ok: result.ok, status: result.status });
                    });
                }).then(undefined, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/shop/theme`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                readBody(req).then(body => {
                    let themeId = '';
                    try {
                        const parsed = JSON.parse(body);
                        if (typeof parsed.themeId === 'string')
                            themeId = parsed.themeId;
                    }
                    catch {
                        themeId = '';
                    }
                    return config.setTheme(themeId).then((result) => {
                        invalidateCache();
                        json(res, 200, { ok: result.ok, status: result.status });
                    });
                }).then(undefined, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/daily-goal/set`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                readBody(req).then(body => {
                    let goal = 0;
                    try {
                        const parsed = JSON.parse(body);
                        if (typeof parsed.goal === 'number')
                            goal = parsed.goal;
                    }
                    catch {
                        goal = 0;
                    }
                    return config.setDailyGoal(goal).then((result) => {
                        invalidateCache();
                        json(res, 200, { ok: result.ok, status: result.status });
                    });
                }).then(undefined, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/daily-goal/claim`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.claimDailyGoal().then((result) => {
                    invalidateCache();
                    json(res, 200, { ok: result.ok, gained: result.gained, status: result.status });
                }, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/weekly-boss/claim`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.claimWeeklyBoss().then((result) => {
                    invalidateCache();
                    json(res, 200, { ok: result.ok, gained: result.gained, status: result.status });
                }, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/weekly-bonus`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.claimWeeklyBonus().then((result) => {
                    invalidateCache();
                    json(res, 200, { ok: result.ok, gained: result.gained, status: result.status });
                }, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/shop/quest-skip`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                config.useQuestSkip().then((result) => {
                    invalidateCache();
                    json(res, 200, { ok: result.ok, status: result.status });
                }, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }, {
            kind: 'exact',
            path: `${STATUS_API_PREFIX}/pass/claim`,
            handler: (req, res) => {
                if (req.method !== 'POST') {
                    json(res, 405, { ok: false, error: 'method-not-allowed' });
                    return;
                }
                readBody(req).then(body => {
                    let tierId = '';
                    try {
                        const parsed = JSON.parse(body);
                        if (typeof parsed.tierId === 'string')
                            tierId = parsed.tierId;
                    }
                    catch {
                        tierId = '';
                    }
                    if (tierId === '') {
                        json(res, 400, { ok: false, error: 'invalid-tier-id' });
                        return undefined;
                    }
                    return config.claimPass(tierId).then((result) => {
                        invalidateCache();
                        json(res, 200, { ok: result.ok, gained: result.gained, status: result.status });
                    });
                }).then(undefined, (error) => json(res, 500, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                }));
            },
        }];
}
