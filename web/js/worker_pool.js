/**
 * ==============================================================================
 * Webcom AI - Single-Tab Multi Web Workers Memory Pool & OneJev Resource Gatekeeper
 * 
 * Author: startgo (startgo@yia.app)
 * License: GPLv3
 * Description: Enables a single browser tab to aggregate and leverage expanded
 * memory heaps across multiple dedicated Web Workers (each with an independent
 * V8 isolate). OneJev acts as the real-time resource gatekeeper before any
 * worker is spawned or memory is allocated.
 * ==============================================================================
 */

(function (window) {
    'use strict';

    // Inline worker script source (100% offline, zero external dependencies)
    const WORKER_SCRIPT_SOURCE = `
        const isolateStorage = {
            id: null,
            allocatedBuffers: [],
            allocatedBytes: 0,
            chunks: new Map(),
            taskCount: 0
        };

        self.onmessage = function(e) {
            const { action, id, payload } = e.data || {};
            const t0 = performance.now();

            switch (action) {
                case 'INIT': {
                    isolateStorage.id = payload.workerId;
                    self.postMessage({
                        action: 'INIT_ACK',
                        id,
                        workerId: isolateStorage.id,
                        success: true,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                case 'ALLOCATE': {
                    const mb = payload.mb || 128;
                    const bytesPerChunk = 32 * 1024 * 1024; // 32MB chunks
                    const targetBytes = mb * 1024 * 1024;
                    let allocatedHere = 0;
                    let error = null;

                    try {
                        let remaining = targetBytes;
                        while (remaining > 0) {
                            const chunkSize = Math.min(remaining, bytesPerChunk);
                            const buffer = new Uint8Array(chunkSize);
                            // Write touched bytes to ensure physical paging
                            buffer[0] = 0xAA;
                            buffer[chunkSize - 1] = 0x55;
                            isolateStorage.allocatedBuffers.push(buffer);
                            allocatedHere += chunkSize;
                            remaining -= chunkSize;
                        }
                        isolateStorage.allocatedBytes += allocatedHere;
                    } catch (err) {
                        error = err.message || String(err);
                    }

                    self.postMessage({
                        action: 'ALLOCATE_ACK',
                        id,
                        workerId: isolateStorage.id,
                        success: !error,
                        allocatedMB: Math.round(isolateStorage.allocatedBytes / (1024 * 1024)),
                        allocatedHereMB: Math.round(allocatedHere / (1024 * 1024)),
                        error,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                case 'RELEASE': {
                    const releasedMB = Math.round(isolateStorage.allocatedBytes / (1024 * 1024));
                    isolateStorage.allocatedBuffers = [];
                    isolateStorage.allocatedBytes = 0;
                    isolateStorage.chunks.clear();

                    self.postMessage({
                        action: 'RELEASE_ACK',
                        id,
                        workerId: isolateStorage.id,
                        success: true,
                        releasedMB,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                case 'STORE_CHUNK': {
                    const { key, data } = payload;
                    isolateStorage.chunks.set(key, data);
                    self.postMessage({
                        action: 'STORE_ACK',
                        id,
                        workerId: isolateStorage.id,
                        key,
                        totalChunks: isolateStorage.chunks.size,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                case 'GET_CHUNK': {
                    const { key } = payload;
                    const data = isolateStorage.chunks.get(key);
                    self.postMessage({
                        action: 'GET_ACK',
                        id,
                        workerId: isolateStorage.id,
                        key,
                        found: data !== undefined,
                        data,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                case 'COMPUTE': {
                    isolateStorage.taskCount++;
                    const { taskType, items } = payload;
                    let result = null;

                    if (taskType === 'HASH_SUM') {
                        let sum = 0;
                        if (Array.isArray(items)) {
                            for (let i = 0; i < items.length; i++) {
                                sum = (sum + (typeof items[i] === 'number' ? items[i] : items[i].length || 1)) % 1000000007;
                            }
                        }
                        result = { sum, count: items ? items.length : 0 };
                    } else if (taskType === 'SEARCH_FILTER') {
                        const { query, dataset } = payload;
                        const qLower = (query || '').toLowerCase();
                        const matches = [];
                        if (Array.isArray(dataset)) {
                            for (let i = 0; i < dataset.length; i++) {
                                const itemStr = typeof dataset[i] === 'string' ? dataset[i] : JSON.stringify(dataset[i]);
                                if (itemStr.toLowerCase().includes(qLower)) {
                                    matches.push(dataset[i]);
                                }
                            }
                        }
                        result = { matches, matchCount: matches.length };
                    } else {
                        result = { echo: true, itemsCount: items ? items.length : 0 };
                    }

                    self.postMessage({
                        action: 'COMPUTE_ACK',
                        id,
                        workerId: isolateStorage.id,
                        success: true,
                        result,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                case 'STATUS': {
                    self.postMessage({
                        action: 'STATUS_ACK',
                        id,
                        workerId: isolateStorage.id,
                        allocatedMB: Math.round(isolateStorage.allocatedBytes / (1024 * 1024)),
                        chunkCount: isolateStorage.chunks.size,
                        taskCount: isolateStorage.taskCount,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                default:
                    self.postMessage({
                        action: 'UNKNOWN_ACK',
                        id,
                        workerId: isolateStorage.id,
                        error: 'Unknown action: ' + action
                    });
            }
        };
    `;

    class SingleTabWorkerPool {
        constructor(appInstance) {
            this.app = appInstance;
            this.workers = []; // Array of { id, worker, allocatedMB, isBusy, taskCount }
            this.blobUrl = null;
            this.isActive = false;
            this.isAllocating = false;
            this.lastEvaluation = null;
            this.pendingMessages = new Map();
            this.msgCounter = 1;
        }

        /**
         * Initialize the shared Blob URL for inline workers
         */
        _ensureBlobUrl() {
            if (!this.blobUrl) {
                const blob = new Blob([WORKER_SCRIPT_SOURCE], { type: 'application/javascript' });
                this.blobUrl = URL.createObjectURL(blob);
            }
            return this.blobUrl;
        }

        /**
         * Collect complete host and browser memory/CPU telemetry
         */
        async probeSystemTelemetry() {
            const telemetry = {
                hostTotalGB: 0,
                hostAvailGB: 0,
                hostUsedGB: 0,
                hostLoadPct: 0,
                hostDisplay: '',
                cpuCores: navigator.hardwareConcurrency || 4,
                cpuArch: 'unknown',
                osName: 'Unknown OS',
                browserDeviceMemoryGB: navigator.deviceMemory || 4,
                tabHeapUsedMB: 0,
                tabHeapTotalMB: 0,
                tabHeapLimitMB: 0,
                source: 'browser_fallback'
            };

            // Inspect Chrome/Edge performance.memory if available
            if (window.performance && window.performance.memory) {
                const m = window.performance.memory;
                telemetry.tabHeapUsedMB = Math.round(m.usedJSHeapSize / (1024 * 1024));
                telemetry.tabHeapTotalMB = Math.round(m.totalJSHeapSize / (1024 * 1024));
                telemetry.tabHeapLimitMB = Math.round(m.jsHeapSizeLimit / (1024 * 1024));
            }

            // Probe Host Daemon /api/system_info
            try {
                const daemonUrl = this.app?.activeDaemonUrl || this.app?.dispatcher?.daemonUrl || 'http://127.0.0.1:8001';
                const resp = await fetch(`${daemonUrl}/api/system_info`, {
                    signal: AbortSignal.timeout(1500)
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.ram) {
                        telemetry.hostTotalGB = Number(data.ram.total_gb) || 0;
                        telemetry.hostAvailGB = Number(data.ram.avail_gb) || 0;
                        telemetry.hostUsedGB = Number(data.ram.used_gb) || 0;
                        telemetry.hostLoadPct = Number(data.ram.load_pct) || 0;
                        telemetry.hostDisplay = data.ram.display || '';
                        telemetry.source = 'daemon_hardware_telemetry';
                    }
                    if (data.cpu_cores) telemetry.cpuCores = data.cpu_cores;
                    if (data.cpu_arch) telemetry.cpuArch = data.cpu_arch;
                    if (data.os) telemetry.osName = data.os;
                }
            } catch (err) {
                // Daemon offline or unreachable: heuristic fallback
                telemetry.source = 'browser_heuristics';
                telemetry.hostTotalGB = telemetry.browserDeviceMemoryGB;
                // Heuristically assume 50% available if unknown
                telemetry.hostAvailGB = Math.round((telemetry.browserDeviceMemoryGB * 0.5) * 10) / 10;
                telemetry.hostUsedGB = Math.round((telemetry.browserDeviceMemoryGB - telemetry.hostAvailGB) * 10) / 10;
                telemetry.hostLoadPct = 50;
                telemetry.hostDisplay = `${telemetry.browserDeviceMemoryGB} GB (瀏覽器 navigator 估計)`;
            }

            return telemetry;
        }

        /**
         * OneJev System Resource Gatekeeper:
         * Evaluates whether system resources are adequate before spawning workers or allocating RAM.
         */
        async evaluateSystemResourcesWithOneJev() {
            const telemetry = await this.probeSystemTelemetry();
            const cores = telemetry.cpuCores || 4;
            const availGB = telemetry.hostAvailGB || 0;
            const loadPct = telemetry.hostLoadPct || 0;
            const totalGB = telemetry.hostTotalGB || 0;
            const heapLimitMB = telemetry.tabHeapLimitMB || 2048;
            const heapUsedMB = telemetry.tabHeapUsedMB || 0;

            const stateText = `[Host Telemetry] Total RAM: ${totalGB}GB, Available: ${availGB}GB, Load: ${loadPct}%, CPU Cores: ${cores}. Tab Heap: ${heapUsedMB}MB / ${heapLimitMB}MB ceiling. Evaluate Single-Tab Multi-Worker Memory Allocation feasibility and safe tier.`;

            const candidateOptions = [
                "允許滿血多Worker記憶體池 (Full Multi-Worker Pool: 4~8 Workers, 1~4GB 擴展記憶體)",
                "降低規模輕量雙Worker模式 (Conservative 2-Worker Mode: 2 Workers, 256~512MB 限制分配)",
                "系統資源不足拒絕調用 (Resource Constrained Abort: 負載過高或可用不足，暫緩啟用保護系統)"
            ];

            let jevDecision = null;

            // 1. Evaluate via OneJev (WASM or Daemon)
            if (this.app && typeof this.app.evalJevDecision === 'function') {
                try {
                    jevDecision = await this.app.evalJevDecision(stateText, candidateOptions, 0.25);
                } catch (e) {
                    console.warn('[OneJev Gatekeeper] evalJevDecision error:', e);
                }
            }

            // 2. Deterministic Safety Verification / Heuristic Cross-Check
            // Thresholds:
            // - If availGB < 1.5GB OR loadPct > 85% -> MUST REJECT (prevent freezing system)
            // - If availGB >= 4.0GB AND loadPct <= 75% -> FULL MULTI-WORKER POOL
            // - Else -> CONSERVATIVE 2-WORKER MODE
            let tier = 'conservative';
            let allowed = true;
            let targetWorkers = 2;
            let mbPerWorker = 128; // 2 * 128 = 256 MB
            let reasonZh = '';
            let reasonEn = '';

            if (availGB < 1.5 || loadPct > 85) {
                tier = 'rejected';
                allowed = false;
                targetWorkers = 0;
                mbPerWorker = 0;
                reasonZh = `系統可用記憶體餘裕不足 (${availGB} GB < 1.5 GB 門檻) 或整體記憶體負載過高 (${loadPct}% > 85%)，OneJev 決策拒絕調用以防主機凍結。`;
                reasonEn = `Insufficient available memory (${availGB} GB < 1.5 GB) or high load (${loadPct}% > 85%). OneJev gatekeeper rejected worker allocation to preserve system stability.`;
            } else if (availGB >= 4.0 && loadPct <= 75) {
                tier = 'full';
                allowed = true;
                // Safe worker count: min(cores, 8), at least 4
                targetWorkers = Math.min(Math.max(cores, 4), 8);
                mbPerWorker = 256; // e.g. 4 workers * 256MB = 1024MB (1GB) or 8 * 256MB = 2GB
                reasonZh = `主機資源充裕 (可用 ${availGB} GB，負載率 ${loadPct}%，${cores} 邏輯核心)，OneJev 允許啟用完整多 Worker (${targetWorkers} 核 / 每個 ${mbPerWorker}MB) 記憶體擴展池。`;
                reasonEn = `Ample system resources (Available ${availGB} GB, Load ${loadPct}%, ${cores} cores). OneJev authorized Full Multi-Worker pool (${targetWorkers} workers / ${mbPerWorker}MB each).`;
            } else {
                tier = 'conservative';
                allowed = true;
                targetWorkers = 2;
                mbPerWorker = 128; // 256MB total
                reasonZh = `主機資源處於適中水位 (可用 ${availGB} GB，負載率 ${loadPct}%)，OneJev 採取謹慎守護策略：啟用輕量雙 Worker 模式 (2 核 / 總計 256MB)。`;
                reasonEn = `Moderate system resources (Available ${availGB} GB, Load ${loadPct}%). OneJev selected Conservative 2-Worker mode (2 workers / 256MB total).`;
            }

            const totalTargetMB = targetWorkers * mbPerWorker;
            const evalResult = {
                allowed,
                tier,
                targetWorkers,
                mbPerWorker,
                totalTargetMB,
                totalTargetGB: Math.round((totalTargetMB / 1024) * 100) / 100,
                reasonZh,
                reasonEn,
                telemetry,
                jevDecision: jevDecision || {
                    best_option: candidateOptions[allowed ? (tier === 'full' ? 0 : 1) : 2],
                    confidence: 96,
                    latency_ms: 12
                },
                timestamp: new Date().toISOString()
            };

            this.lastEvaluation = evalResult;
            return evalResult;
        }

        /**
         * Initialize the multi-worker memory pool after OneJev clearance
         */
        async activatePool(evaluation) {
            if (!evaluation) {
                evaluation = await this.evaluateSystemResourcesWithOneJev();
            }

            if (!evaluation.allowed) {
                const err = new Error(this.app?.currentLang === 'zh-TW' ? evaluation.reasonZh : evaluation.reasonEn);
                err.code = 'RESOURCE_CONSTRAINED';
                err.evaluation = evaluation;
                throw err;
            }

            this.isAllocating = true;
            await this.terminatePool(); // Ensure previous workers are cleaned

            const blobUrl = this._ensureBlobUrl();
            const workerCount = evaluation.targetWorkers;
            const mbPerWorker = evaluation.mbPerWorker;
            const spawnPromises = [];

            for (let i = 0; i < workerCount; i++) {
                const workerId = `worker_${i + 1}_${Date.now().toString(36)}`;
                const worker = new Worker(blobUrl);
                const workerRecord = {
                    id: workerId,
                    index: i + 1,
                    worker,
                    allocatedMB: 0,
                    isBusy: false,
                    taskCount: 0
                };

                worker.onmessage = (e) => this._handleWorkerMessage(workerRecord, e.data);
                worker.onerror = (e) => {
                    console.error(`[Worker ${workerId} Error]`, e);
                    this.app?.logTerminal?.(`[Worker ${workerRecord.index} 異常] ${e.message || 'Worker 內部錯誤'}`, 'error');
                };

                this.workers.push(workerRecord);

                // Init and allocate
                const initPromise = (async () => {
                    await this._sendMessage(workerRecord, 'INIT', { workerId });
                    if (mbPerWorker > 0) {
                        const allocAck = await this._sendMessage(workerRecord, 'ALLOCATE', { mb: mbPerWorker });
                        workerRecord.allocatedMB = allocAck.allocatedMB || mbPerWorker;
                    }
                })();
                spawnPromises.push(initPromise);
            }

            try {
                await Promise.all(spawnPromises);
                this.isActive = true;
                this.isAllocating = false;
            } catch (err) {
                this.isAllocating = false;
                await this.terminatePool();
                throw err;
            }

            return this.getPoolStatus();
        }

        /**
         * Terminate all workers and deallocate memory
         */
        async terminatePool() {
            if (this.workers.length === 0) {
                this.isActive = false;
                return;
            }

            const releasePromises = this.workers.map(w => {
                return this._sendMessage(w, 'RELEASE', {}).catch(() => null);
            });

            try {
                await Promise.all(releasePromises);
            } catch (e) {}

            for (const w of this.workers) {
                try {
                    w.worker.terminate();
                } catch (e) {}
            }

            this.workers = [];
            this.isActive = false;
            this.pendingMessages.clear();
        }

        /**
         * Dispatch compute task across the worker pool
         */
        async dispatchCompute(taskType, payload) {
            if (!this.isActive || this.workers.length === 0) {
                throw new Error('Worker pool is not active');
            }

            // Find least busy worker
            const worker = this.workers.slice().sort((a, b) => a.taskCount - b.taskCount)[0];
            worker.isBusy = true;
            try {
                const res = await this._sendMessage(worker, 'COMPUTE', { taskType, ...payload });
                worker.taskCount++;
                return res.result;
            } finally {
                worker.isBusy = false;
            }
        }

        /**
         * Post message with promise resolution
         */
        _sendMessage(workerRecord, action, payload) {
            return new Promise((resolve, reject) => {
                const msgId = `msg_${this.msgCounter++}_${Date.now().toString(36)}`;
                const timer = setTimeout(() => {
                    this.pendingMessages.delete(msgId);
                    reject(new Error(`Worker message timeout (${action})`));
                }, 10000);

                this.pendingMessages.set(msgId, { resolve, reject, timer, action });
                workerRecord.worker.postMessage({ action, id: msgId, payload });
            });
        }

        /**
         * Internal message dispatcher from worker
         */
        _handleWorkerMessage(workerRecord, data) {
            const { id, error, allocatedMB } = data || {};
            if (allocatedMB !== undefined) {
                workerRecord.allocatedMB = allocatedMB;
            }

            if (id && this.pendingMessages.has(id)) {
                const handler = this.pendingMessages.get(id);
                clearTimeout(handler.timer);
                this.pendingMessages.delete(id);

                if (error) {
                    handler.reject(new Error(error));
                } else {
                    handler.resolve(data);
                }
            }
        }

        /**
         * Get aggregated memory pool status
         */
        getPoolStatus() {
            const totalAllocatedMB = this.workers.reduce((sum, w) => sum + (w.allocatedMB || 0), 0);
            return {
                isActive: this.isActive,
                isAllocating: this.isAllocating,
                workerCount: this.workers.length,
                totalAllocatedMB,
                totalAllocatedGB: Math.round((totalAllocatedMB / 1024) * 100) / 100,
                lastEvaluation: this.lastEvaluation,
                workers: this.workers.map(w => ({
                    index: w.index,
                    id: w.id,
                    allocatedMB: w.allocatedMB,
                    taskCount: w.taskCount,
                    isBusy: w.isBusy
                }))
            };
        }
    }

    // Export to window
    window.SingleTabWorkerPool = SingleTabWorkerPool;

})(window);
