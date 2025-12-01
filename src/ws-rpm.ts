// src/ws-rpm.ts

// 最新 RPM（Tesla CAN → WS → engine-sim）
let latestRpm = 0;

// 平滑过滤（避免声音抖动）
let smoothedRpm = 0;
const SMOOTH_FACTOR = 0.12;

// 可选扩展
let latestGear: number | null = null;
let latestThrottle: number | null = null;

// WebSocket handler
let ws: WebSocket | null = null;

/** engine.ts 调用这里来获取平滑后的 RPM */
export function getLatestRpm(): number {
    return smoothedRpm;
}

export function getLatestGear(): number | null {
    return latestGear;
}

export function getLatestThrottle(): number | null {
    return latestThrottle;
}

/** 
 * Core smoothing (Tesla 电机数据 100hz → 声音渲染 60hz)
 * 防止 engine-sim pitch “跳动”或“破音”
 */
function smoothRpm(target: number) {
    smoothedRpm = smoothedRpm + (target - smoothedRpm) * SMOOTH_FACTOR;
}

/** 
 * 初始化 WebSocket
 * 自动重连 + 心跳检测 + 平滑过滤
 */
export function initRpmSocket(url: string) {
    console.log(`[WS] Connecting to ${url} ...`);

    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log("[WS] Connected");
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (typeof data.rpm === "number") {
                latestRpm = data.rpm;
                smoothRpm(latestRpm);
            }

            if (typeof data.gear === "number") {
                latestGear = data.gear;
            }

            if (typeof data.throttle === "number") {
                latestThrottle = data.throttle;
            }

        } catch (e) {
            console.warn("[WS] Parse error:", e);
        }
    };

    ws.onerror = (err) => {
        console.warn("[WS] error:", err);
    };

    ws.onclose = () => {
        console.warn("[WS] Disconnected. Reconnecting in 2000ms...");
        ws = null;
        setTimeout(() => initRpmSocket(url), 2000);
    };
}