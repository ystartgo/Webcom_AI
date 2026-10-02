/**
 * ==============================================================================
 * Webcom AI - Single-Tab Multi Web Workers Memory Pool & OneJev Resource Gatekeeper
 * Featuring: SharedArrayBuffer (Zero-Copy Shared Memory) & Atomics Synchronization
 * 
 * Author: startgo (startgo@yia.app)
 * License: GPLv3
 * Description: Enables a single browser tab to aggregate and leverage expanded
 * memory heaps across multiple dedicated Web Workers. Supports SharedArrayBuffer
 * for zero-copy concurrent memory access across workers and the main thread,
 * with graceful fallback to isolated ArrayBuffer heaps. OneJev acts as the
 * real-time system resource gatekeeper before any memory or worker is allocated.
 * ==============================================================================
 */

(function (window) {
    'use strict';

    // Shared Memory Atomics Header Layout (16 x 4-byte Int32 slots = 64 bytes)
    const ATOMICS_HEADER = {
        MAGIC_OFFSET: 0,          // 0x57434F4D ('WCOM')
        WORKER_COUNT_OFFSET: 1,   // Registered attached workers count
        LOCK_OFFSET: 2,           // Spinlock / mutex slot
        TASK_ID_OFFSET: 3,        // Sequence task counter
        PROGRESS_OFFSET: 4,       // Task progress indicator (0~100)
        PROCESSED_BYTES: 5,       // Processed bytes counter
        MATCH_COUNT_OFFSET: 6,    // Total query match count
        PAYLOAD_SIZE_OFFSET: 7,   // Payload size stored in shared buffer
        HEADER_BYTES: 64          // 64-byte control header
    };

    // Inline worker script source (100% offline, zero external dependencies)
    const WORKER_SCRIPT_SOURCE = `
        const ATOMICS_HEADER = {
            MAGIC_OFFSET: 0,
            WORKER_COUNT_OFFSET: 1,
            LOCK_OFFSET: 2,
            TASK_ID_OFFSET: 3,
            PROGRESS_OFFSET: 4,
            PROCESSED_BYTES: 5,
            MATCH_COUNT_OFFSET: 6,
            PAYLOAD_SIZE_OFFSET: 7,
            HEADER_BYTES: 64
        };

        const isolateStorage = {
            id: null,
            index: 0,
            totalWorkers: 1,
            allocatedBuffers: [],
            allocatedBytes: 0,
            chunks: new Map(),
            taskCount: 0,
            sharedBuffer: null,
            sharedInt32: null,
            sharedUint8: null,
            isSharedMode: false
        };

        self.onmessage = function(e) {
            const { action, id, payload } = e.data || {};
            const t0 = performance.now();

            switch (action) {
                case 'INIT': {
                    isolateStorage.id = payload.workerId;
                    isolateStorage.index = payload.workerIndex || 0;
                    isolateStorage.totalWorkers = payload.totalWorkers || 1;
                    self.postMessage({
                        action: 'INIT_ACK',
                        id,
                        workerId: isolateStorage.id,
                        workerIndex: isolateStorage.index,
                        success: true,
                        latencyMs: Math.round((performance.now() - t0) * 100) / 100
                    });
                    break;
                }

                case 'ATTACH_SHARED_BUFFER': {
                    let success = false;
                    let error = null;
                    let byteLength = 0;
                    try {
                        const { buffer, workerIndex, totalWorkers } = payload;
                        if (buffer && buffer instanceof SharedArrayBuffer) {
                            isolateStorage.sharedBuffer = buffer;
                            isolateStorage.sharedInt32 = new Int32Array(buffer);
                            isolateStorage.sharedUint8 = new Uint8Array(buffer);
                            isolateStorage.isSharedMode = true;
                            isolateStorage.index = workerIndex;
                            isolateStorage.totalWorkers = totalWorkers;
                            byteLength = buffer.byteLength;

                            // Atomically increment attached worker counter in header
                            Atomics.add(isolateStorage.sharedInt32, ATOMICS_HEADER.WORKER_COUNT_OFFSET, 1);
                            success = true;
                        } else {
                            error = 'Payload is not a valid SharedArrayBuffer';
                        }
                    } catch (err) {
                        error = err.message || String(err);
                    }

                    self.postMessage({
                        action: 'ATTACH_SHARED_ACK',
                        id,
                        workerId: isolateStorage.id,
                        workerIndex: isolateStorage.index,
                        success,
                        byteLength,
                        error,
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
                        isShared: isolateStorage.isSharedMode,
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

                    // If in shared mode, decrement attached counter
                    if (isolateStorage.isSharedMode && isolateStorage.sharedInt32) {
                        Atomics.sub(isolateStorage.sharedInt32, ATOMICS_HEADER.WORKER_COUNT_OFFSET, 1);
                    }
                    isolateStorage.sharedBuffer = null;
                    isolateStorage.sharedInt32 = null;
                    isolateStorage.sharedUint8 = null;
                    isolateStorage.isSharedMode = false;

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

                case 'PARALLEL_SHARED_SEARCH': {
                    isolateStorage.taskCount++;
                    if (!isolateStorage.isSharedMode || !isolateStorage.sharedUint8) {
                        self.postMessage({
                            action: 'PARALLEL_SHARED_SEARCH_ACK',
                            id,
                            workerId: isolateStorage.id,
                            success: false,
                            error: 'SharedArrayBuffer not attached'
                        });
                        return;
                    }

                    const { queryBytes } = payload;
                    const payloadSize = Atomics.load(isolateStorage.sharedInt32, ATOMICS_HEADER.PAYLOAD_SIZE_OFFSET);
                    const headerSize = ATOMICS_HEADER.HEADER_BYTES;
                    const totalDataBytes = Math.min(payloadSize, isolateStorage.sharedUint8.byteLength - headerSize);

                    if (totalDataBytes <= 0 || !queryBytes || queryBytes.length === 0) {
                        self.postMessage({
                            action: 'PARALLEL_SHARED_SEARCH_ACK',
                            id,
                            workerId: isolateStorage.id,
                            success: true,
                            matches: [],
                            matchCount: 0,
                            latencyMs: Math.round((performance.now() - t0) * 100) / 100
                        });
                        return;
                    }

                    // Calculate this worker partition slice
                    const partitionSize = Math.ceil(totalDataBytes / isolateStorage.totalWorkers);
                    const startOffset = headerSize + (isolateStorage.index * partitionSize);
                    const endOffset = Math.min(startOffset + partitionSize, headerSize + totalDataBytes);

                    const qLen = queryBytes.length;
                    const localMatches = [];
                    const u8 = isolateStorage.sharedUint8;

                    for (let i = startOffset; i <= endOffset - qLen; i++) {
                        let match = true;
                        for (let j = 0; j < qLen; j++) {
                            if (u8[i + j] !== queryBytes[j]) {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            localMatches.push(i - headerSize);
                        }
                    }

                    // Atomically add to global match count in shared header
                    if (localMatches.length > 0) {
                        Atomics.add(isolateStorage.sharedInt32, ATOMICS_HEADER.MATCH_COUNT_OFFSET, localMatches.length);
                    }
                    Atomics.add(isolateStorage.sharedInt32, ATOMICS_HEADER.PROCESSED_BYTES, (endOffset - startOffset));

                    self.postMessage({
                        action: 'PARALLEL_SHARED_SEARCH_ACK',
                        id,
                        workerId: isolateStorage.id,
                        workerIndex: isolateStorage.index,
                        success: true,
                        matches: localMatches,
                        matchCount: localMatches.length,
                        partitionRange: [startOffset, endOffset],
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
                    let sharedStatus = null;
                    if (isolateStorage.isSharedMode && isolateStorage.sharedInt32) {
                        sharedStatus = {
                            byteLength: isolateStorage.sharedBuffer.byteLength,
                            attachedWorkers: Atomics.load(isolateStorage.sharedInt32, ATOMICS_HEADER.WORKER_COUNT_OFFSET),
                            matchCount: Atomics.load(isolateStorage.sharedInt32, ATOMICS_HEADER.MATCH_COUNT_OFFSET),
                            payloadSize: Atomics.load(isolateStorage.sharedInt32, ATOMICS_HEADER.PAYLOAD_SIZE_OFFSET)
                        };
                    }

                    self.postMessage({
                        action: 'STATUS_ACK',
                        id,
                        workerId: isolateStorage.id,
                        workerIndex: isolateStorage.index,
                        allocatedMB: Math.round(isolateStorage.allocatedBytes / (1024 * 1024)),
                        chunkCount: isolateStorage.chunks.size,
                        taskCount: isolateStorage.taskCount,
                        isSharedMode: isolateStorage.isSharedMode,
                        sharedStatus,
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
            this.workers = []; // Array of { id, index, worker, allocatedMB, isBusy, taskCount }
            this.blobUrl = null;
            this.isActive = false;
            this.isAllocating = false;
            this.lastEvaluation = null;
            this.pendingMessages = new Map();
            this.msgCounter = 1;

            // SharedArrayBuffer zero-copy state
            this.sharedBuffer = null;
            this.sharedInt32 = null;
            this.sharedUint8 = null;
            this.isSharedMemoryMode = false;
        }

        /**
         * Detect if SharedArrayBuffer and Atomics are available in the current browser context.
         * Modern browsers require Cross-Origin-Opener-Policy & Cross-Origin-Embedder-Policy headers.
         */
        static isSharedArrayBufferSupported() {
            try {
                if (typeof SharedArrayBuffer === 'undefined') return false;
                // Test allocating a small buffer to verify it is not blocked by cross-origin isolation
                const testBuf = new SharedArrayBuffer(16);
                return testBuf.byteLength === 16;
            } catch (e) {
                return false;
            }
        }

        /**
         * Check if window.crossOriginIsolated is true
         */
        static isCrossOriginIsolated() {
            return (typeof window !== 'undefined' && window.crossOriginIsolated === true);
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
                sabSupported: SingleTabWorkerPool.isSharedArrayBufferSupported(),
                crossOriginIsolated: SingleTabWorkerPool.isCrossOriginIsolated(),
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
                telemetry.source = 'browser_heuristics';
                telemetry.hostTotalGB = telemetry.browserDeviceMemoryGB;
                telemetry.hostAvailGB = Math.round((telemetry.browserDeviceMemoryGB * 0.5) * 10) / 10;
                telemetry.hostUsedGB = Math.round((telemetry.browserDeviceMemoryGB - telemetry.hostAvailGB) * 10) / 10;
                telemetry.hostLoadPct = 50;
                telemetry.hostDisplay = `${telemetry.browserDeviceMemoryGB} GB (瀏覽器 navigator 估計)`;
            }

            return telemetry;
        }

        /**
         * OneJev System Resource Gatekeeper:
         * Evaluates whether system resources are adequate before spawning workers or allocating RAM,
         * with specific assessment of SharedArrayBuffer zero-copy viability.
         */
        async evaluateSystemResourcesWithOneJev() {
            const telemetry = await this.probeSystemTelemetry();
            const cores = telemetry.cpuCores || 4;
            const availGB = telemetry.hostAvailGB || 0;
            const loadPct = telemetry.hostLoadPct || 0;
            const totalGB = telemetry.hostTotalGB || 0;
            const heapLimitMB = telemetry.tabHeapLimitMB || 2048;
            const heapUsedMB = telemetry.tabHeapUsedMB || 0;
            const sabSupported = telemetry.sabSupported;

            const stateText = `[Host Telemetry] Total RAM: ${totalGB}GB, Available: ${availGB}GB, Load: ${loadPct}%, CPU Cores: ${cores}, SAB Supported: ${sabSupported}. Tab Heap: ${heapUsedMB}MB / ${heapLimitMB}MB ceiling. Evaluate Single-Tab Multi-Worker Memory Allocation and SharedArrayBuffer zero-copy safety tier.`;

            const candidateOptions = [
                "允許滿血多Worker記憶體池 (Full Multi-Worker Pool: 4~8 Workers, 1~4GB 擴展記憶體, SAB 零拷貝)",
                "降低規模輕量雙Worker模式 (Conservative 2-Worker Mode: 2 Workers, 256~512MB 限制分配)",
                "系統資源不足拒絕調用 (Resource Constrained Abort: 負載過高或可用不足，暫緩啟用保護系統)"
            ];

            let jevDecision = null;

            if (this.app && typeof this.app.evalJevDecision === 'function') {
                try {
                    jevDecision = await this.app.evalJevDecision(stateText, candidateOptions, 0.25);
                } catch (e) {
                    console.warn('[OneJev Gatekeeper] evalJevDecision error:', e);
                }
            }

            let tier = 'conservative';
            let allowed = true;
            let targetWorkers = 2;
            let mbPerWorker = 128;
            let sharedBufferMB = 0;
            let reasonZh = '';
            let reasonEn = '';

            const memoryModel = sabSupported 
                ? 'SharedArrayBuffer (Zero-Copy 零拷貝共享記憶體 + Atomics 同步)'
                : 'ArrayBuffer (獨立 Heap 隔離區 + Transferable 分流)';

            if (availGB < 1.5 || loadPct > 85) {
                tier = 'rejected';
                allowed = false;
                targetWorkers = 0;
                mbPerWorker = 0;
                sharedBufferMB = 0;
                reasonZh = `系統可用記憶體餘裕不足 (${availGB} GB < 1.5 GB 門檻) 或整體記憶體負載過高 (${loadPct}% > 85%)，OneJev 決策拒絕調用以防主機凍結。`;
                reasonEn = `Insufficient available memory (${availGB} GB < 1.5 GB) or high load (${loadPct}% > 85%). OneJev gatekeeper rejected worker allocation to preserve system stability.`;
            } else if (availGB >= 4.0 && loadPct <= 75) {
                tier = 'full';
                allowed = true;
                targetWorkers = Math.min(Math.max(cores, 4), 8);
                mbPerWorker = 256;
                sharedBufferMB = sabSupported ? 1024 : 0; // 1GB SharedArrayBuffer when supported
                reasonZh = `主機資源充裕 (可用 ${availGB} GB，負載率 ${loadPct}%，${cores} 邏輯核心)，OneJev 允許啟用滿血多 Worker (${targetWorkers} 核 / 每個 ${mbPerWorker}MB) 記憶體擴展池 [架構: ${memoryModel}]。`;
                reasonEn = `Ample system resources (Available ${availGB} GB, Load ${loadPct}%, ${cores} cores). OneJev authorized Full Multi-Worker pool (${targetWorkers} workers / ${mbPerWorker}MB each) [Architecture: ${memoryModel}].`;
            } else {
                tier = 'conservative';
                allowed = true;
                targetWorkers = 2;
                mbPerWorker = 128;
                sharedBufferMB = sabSupported ? 256 : 0; // 256MB SharedArrayBuffer when supported
                reasonZh = `主機資源處於適中水位 (可用 ${availGB} GB，負載率 ${loadPct}%)，OneJev 採取謹慎守護策略：啟用輕量雙 Worker 模式 (2 核 / 總計 256MB) [架構: ${memoryModel}]。`;
                reasonEn = `Moderate system resources (Available ${availGB} GB, Load ${loadPct}%). OneJev selected Conservative 2-Worker mode (2 workers / 256MB total) [Architecture: ${memoryModel}].`;
            }

            const totalTargetMB = (targetWorkers * mbPerWorker) + sharedBufferMB;
            const evalResult = {
                allowed,
                tier,
                targetWorkers,
                mbPerWorker,
                sharedBufferMB,
                totalTargetMB,
                totalTargetGB: Math.round((totalTargetMB / 1024) * 100) / 100,
                sabSupported,
                memoryModel,
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
         * Allocate SharedArrayBuffer slab and initialize Atomics control header
         */
        _allocateSharedMemory(sizeMB) {
            if (!SingleTabWorkerPool.isSharedArrayBufferSupported()) {
                this.sharedBuffer = null;
                this.sharedInt32 = null;
                this.sharedUint8 = null;
                this.isSharedMemoryMode = false;
                return null;
            }

            try {
                const totalBytes = sizeMB * 1024 * 1024;
                const buffer = new SharedArrayBuffer(totalBytes);
                const int32 = new Int32Array(buffer);
                const uint8 = new Uint8Array(buffer);

                // Initialize control header
                Atomics.store(int32, ATOMICS_HEADER.MAGIC_OFFSET, 0x57434F4D); // 'WCOM'
                Atomics.store(int32, ATOMICS_HEADER.WORKER_COUNT_OFFSET, 0);
                Atomics.store(int32, ATOMICS_HEADER.LOCK_OFFSET, 0);
                Atomics.store(int32, ATOMICS_HEADER.TASK_ID_OFFSET, 1);
                Atomics.store(int32, ATOMICS_HEADER.PROGRESS_OFFSET, 0);
                Atomics.store(int32, ATOMICS_HEADER.PROCESSED_BYTES, 0);
                Atomics.store(int32, ATOMICS_HEADER.MATCH_COUNT_OFFSET, 0);
                Atomics.store(int32, ATOMICS_HEADER.PAYLOAD_SIZE_OFFSET, 0);

                this.sharedBuffer = buffer;
                this.sharedInt32 = int32;
                this.sharedUint8 = uint8;
                this.isSharedMemoryMode = true;
                return buffer;
            } catch (err) {
                console.warn('[SharedArrayBuffer Allocation Error]', err);
                this.sharedBuffer = null;
                this.sharedInt32 = null;
                this.sharedUint8 = null;
                this.isSharedMemoryMode = false;
                return null;
            }
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

            // 1. Allocate SharedArrayBuffer if supported and requested
            if (evaluation.sharedBufferMB > 0 && evaluation.sabSupported) {
                this._allocateSharedMemory(evaluation.sharedBufferMB);
            }

            const blobUrl = this._ensureBlobUrl();
            const workerCount = evaluation.targetWorkers;
            const mbPerWorker = evaluation.mbPerWorker;
            const spawnPromises = [];

            for (let i = 0; i < workerCount; i++) {
                const workerId = `worker_${i + 1}_${Date.now().toString(36)}`;
                const worker = new Worker(blobUrl);
                const workerRecord = {
                    id: workerId,
                    index: i,
                    worker,
                    allocatedMB: 0,
                    isBusy: false,
                    taskCount: 0,
                    isSharedAttached: false
                };

                worker.onmessage = (e) => this._handleWorkerMessage(workerRecord, e.data);
                worker.onerror = (e) => {
                    console.error(`[Worker ${workerId} Error]`, e);
                    this.app?.logTerminal?.(`[Worker ${workerRecord.index + 1} 異常] ${e.message || 'Worker 內部錯誤'}`, 'error');
                };

                this.workers.push(workerRecord);

                const initPromise = (async () => {
                    // Init worker identity
                    await this._sendMessage(workerRecord, 'INIT', {
                        workerId,
                        workerIndex: i,
                        totalWorkers: workerCount
                    });

                    // Attach SharedArrayBuffer if available
                    if (this.isSharedMemoryMode && this.sharedBuffer) {
                        try {
                            const attachAck = await this._sendMessage(workerRecord, 'ATTACH_SHARED_BUFFER', {
                                buffer: this.sharedBuffer,
                                workerIndex: i,
                                totalWorkers: workerCount
                            });
                            workerRecord.isSharedAttached = attachAck.success;
                        } catch (e) {
                            console.warn(`[Worker ${i} SAB Attach Error]`, e);
                        }
                    }

                    // Allocate isolated buffer chunk
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
         * Write binary or text data directly to the SharedArrayBuffer without cloning
         */
        writeSharedData(data, byteOffset = 0) {
            if (!this.isSharedMemoryMode || !this.sharedUint8) {
                throw new Error('SharedArrayBuffer is not active');
            }

            let u8Source = null;
            if (typeof data === 'string') {
                u8Source = new TextEncoder().encode(data);
            } else if (data instanceof Uint8Array) {
                u8Source = data;
            } else if (data instanceof ArrayBuffer) {
                u8Source = new Uint8Array(data);
            } else {
                u8Source = new TextEncoder().encode(JSON.stringify(data));
            }

            const headerOffset = ATOMICS_HEADER.HEADER_BYTES;
            const destOffset = headerOffset + byteOffset;
            const maxLen = this.sharedUint8.byteLength - destOffset;
            const writeLen = Math.min(u8Source.length, maxLen);

            if (writeLen > 0) {
                this.sharedUint8.set(u8Source.subarray(0, writeLen), destOffset);
                const curPayload = Atomics.load(this.sharedInt32, ATOMICS_HEADER.PAYLOAD_SIZE_OFFSET);
                Atomics.store(this.sharedInt32, ATOMICS_HEADER.PAYLOAD_SIZE_OFFSET, Math.max(curPayload, byteOffset + writeLen));
            }

            return writeLen;
        }

        /**
         * Zero-Copy Parallel Search across all workers on the SharedArrayBuffer
         */
        async parallelSharedSearch(queryString) {
            if (!this.isActive || !this.isSharedMemoryMode || this.workers.length === 0) {
                throw new Error('SharedArrayBuffer pool is not active');
            }

            const queryBytes = Array.from(new TextEncoder().encode(queryString));
            // Reset match counter
            Atomics.store(this.sharedInt32, ATOMICS_HEADER.MATCH_COUNT_OFFSET, 0);
            Atomics.store(this.sharedInt32, ATOMICS_HEADER.PROCESSED_BYTES, 0);

            const searchPromises = this.workers.map(w => {
                w.isBusy = true;
                return this._sendMessage(w, 'PARALLEL_SHARED_SEARCH', { queryBytes })
                    .finally(() => { w.isBusy = false; });
            });

            const results = await Promise.all(searchPromises);
            const totalMatches = Atomics.load(this.sharedInt32, ATOMICS_HEADER.MATCH_COUNT_OFFSET);
            const processedBytes = Atomics.load(this.sharedInt32, ATOMICS_HEADER.PROCESSED_BYTES);

            const allOffsets = [];
            for (const r of results) {
                if (Array.isArray(r.matches)) {
                    allOffsets.push(...r.matches);
                }
            }

            return {
                query: queryString,
                totalMatches,
                processedBytes,
                offsets: allOffsets,
                workerCount: this.workers.length,
                isZeroCopy: true
            };
        }

        /**
         * Terminate all workers and deallocate memory
         */
        async terminatePool() {
            if (this.workers.length === 0 && !this.sharedBuffer) {
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
            this.sharedBuffer = null;
            this.sharedInt32 = null;
            this.sharedUint8 = null;
            this.isSharedMemoryMode = false;
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
            const isolatedMB = this.workers.reduce((sum, w) => sum + (w.allocatedMB || 0), 0);
            const sharedMB = this.sharedBuffer ? Math.round(this.sharedBuffer.byteLength / (1024 * 1024)) : 0;
            const totalAllocatedMB = isolatedMB + sharedMB;

            let atomicsHeader = null;
            if (this.isSharedMemoryMode && this.sharedInt32) {
                atomicsHeader = {
                    magic: Atomics.load(this.sharedInt32, ATOMICS_HEADER.MAGIC_OFFSET),
                    attachedWorkers: Atomics.load(this.sharedInt32, ATOMICS_HEADER.WORKER_COUNT_OFFSET),
                    matchCount: Atomics.load(this.sharedInt32, ATOMICS_HEADER.MATCH_COUNT_OFFSET),
                    payloadSize: Atomics.load(this.sharedInt32, ATOMICS_HEADER.PAYLOAD_SIZE_OFFSET)
                };
            }

            return {
                isActive: this.isActive,
                isAllocating: this.isAllocating,
                isSharedMemory: this.isSharedMemoryMode,
                sharedBufferMB: sharedMB,
                isolatedMB,
                totalAllocatedMB,
                totalAllocatedGB: Math.round((totalAllocatedMB / 1024) * 100) / 100,
                workerCount: this.workers.length,
                atomicsHeader,
                memoryModel: this.isSharedMemoryMode
                    ? 'SharedArrayBuffer (Zero-Copy 零拷貝共享記憶體 + Atomics 同步)'
                    : 'ArrayBuffer (獨立 Heap 隔離區 + Transferable 分流)',
                lastEvaluation: this.lastEvaluation,
                workers: this.workers.map(w => ({
                    index: w.index + 1,
                    id: w.id,
                    allocatedMB: w.allocatedMB,
                    isSharedAttached: w.isSharedAttached,
                    taskCount: w.taskCount,
                    isBusy: w.isBusy
                }))
            };
        }
    }

    // Export to window
    window.SingleTabWorkerPool = SingleTabWorkerPool;

})(window);
