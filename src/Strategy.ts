// --- 基礎型別定義 ---
export type HandResult = { w: 'P'|'B'|'T'; bp: boolean; pp: boolean; l6: boolean };
export type BetTarget = 'P'|'B'|'T'|'BP'|'PP'|'L6';

export interface StrategyConfig {
    name: string;
    shoes: number;
    baseBet: number;
    initialBal: number;
    custom?: {
        triggerCount: number;       
        triggerTargets: BetTarget[];
        betAction: BetTarget | 'FOLLOW'; 
        mode: 'WIN_CHASE' | 'LOSS_CHASE' | 'ONCE'; 
    };
}

export interface SimStats {
    total: number;
    betCount: number;
    wins: number;
    losses: number;
    ties: number;
    endBal: number;
    maxDD: number; 
    history: number[];
    counts: Record<string, number>;
    logs: string[]; // [新增] 決策日誌
}

// --- 核心工具函式 ---

const createShoe = () => {
    const deck = Array.from({length: 416}, (_, i) => {
        const rank = (i % 13) + 1;
        const value = rank >= 10 ? 0 : rank;
        return { r: rank, v: value };
    });
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const getPoint = (cards: {v: number}[]) => cards.reduce((a, c) => a + c.v, 0) % 10;

const runHand = (shoe: {r: number, v: number}[]): HandResult | null => {
    if (shoe.length < 6) return null;

    const p1 = shoe.pop()!;
    const b1 = shoe.pop()!;
    const p2 = shoe.pop()!;
    const b2 = shoe.pop()!;
    
    const pHand = [p1, p2];
    const bHand = [b1, b2];

    let pv = getPoint(pHand);
    let bv = getPoint(bHand);
    
    if (pv < 8 && bv < 8) {
        let p3v = -1;
        if (pv <= 5) {
            const p3 = shoe.pop()!;
            pHand.push(p3);
            pv = getPoint(pHand);
            p3v = p3.v;
        }
        let bDraw = false;
        if (bv <= 2) bDraw = true;
        else if (bv === 3) bDraw = p3v !== 8;
        else if (bv === 4) bDraw = p3v !== 0 && p3v !== 1 && p3v !== 8 && p3v !== 9;
        else if (bv === 5) bDraw = p3v === -1 ? false : (p3v >= 4 && p3v <= 7);
        else if (bv === 6) bDraw = p3v === 6 || p3v === 7;
        
        if (p3v === -1 && bv <= 5) bDraw = true;

        if (bDraw) {
            const b3 = shoe.pop()!;
            bHand.push(b3);
            bv = getPoint(bHand);
        }
    }

    const w = pv > bv ? 'P' : bv > pv ? 'B' : 'T';
    const pp = p1.r === p2.r;
    const bp = b1.r === b2.r;
    const l6 = w === 'B' && bv === 6;

    return { w, pp, bp, l6 };
};

const getPayout = (target: BetTarget, isL6: boolean): number => {
    switch (target) {
        case 'P': return 2.0;
        case 'B': return isL6 ? 1.5 : 1.95; 
        case 'T': return 9.0;
        case 'BP': 
        case 'PP': return 12.0;
        case 'L6': return 13.0; 
        default: return 0;
    }
};

const getMartingaleMultiplier = (target: BetTarget): number => {
    switch (target) {
        case 'P': return 2.0;
        case 'B': return 2.1; 
        case 'T': return 1.2; 
        case 'BP':
        case 'PP': 
        case 'L6': return 1.1; 
        default: return 2.0;
    }
};

const checkMatch = (res: HandResult, target: BetTarget): boolean => {
    if (target === 'P') return res.w === 'P';
    if (target === 'B') return res.w === 'B';
    if (target === 'T') return res.w === 'T';
    if (target === 'BP') return res.bp;
    if (target === 'PP') return res.pp;
    if (target === 'L6') return res.l6;
    return false;
};

// --- [主模擬函數] ---
export const runSimulation = async (cfg: StrategyConfig): Promise<SimStats> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let bal = cfg.initialBal;
            const history = [bal];
            const counts = { B:0, P:0, T:0, BP:0, PP:0, L6:0 };
            let wins = 0, losses = 0, ties = 0;
            let total = 0;
            let betCount = 0;

            // 日誌收集器
            const logs: string[] = [];
            // 寫入日誌 Helper
            const addLog = (msg: string) => {
                if (total <= 200) { // 只記錄前 200 手
                    logs.push(`[第 ${total + 1} 局] ${msg}`);
                }
            };

            let bet: number = cfg.baseBet;
            let target: BetTarget | null = 'P';
            
            let paroliStep = 0;
            const fibSeq = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
            let fibIdx = 0;

            const custom = cfg.custom;
            let sessionActive = false; 
            let lastResults: HandResult[] = []; 
            let customTarget: BetTarget | null = null; 
            let waitForBreak = false; 
            let trackedTriggerType: BetTarget | null = null; 

            for (let s = 0; s < cfg.shoes; s++) {
                const shoe = createShoe();
                const cutPos = Math.floor(Math.random() * (200 - 12 + 1)) + 12;

                lastResults = []; 
                sessionActive = false;
                waitForBreak = false;
                trackedTriggerType = null;
                
                if (total <= 200) logs.push(`--- 第 ${s + 1} 靴開始 ---`);

                while (shoe.length > cutPos) {
                    let placeBet = false;
                    let logMsg = ""; // 本局決策訊息

                    if (cfg.name === 'custom' && custom) {
                        const N = custom.triggerCount;
                        
                        // 狀態描述
                        let statusStr = waitForBreak ? "等待斷路中" : sessionActive ? "策略執行中" : "監聽中";
                        
                        if (waitForBreak) {
                            placeBet = false;
                            logMsg += `[狀態: ${statusStr}] 鎖定類型: ${trackedTriggerType}. 不下注. `;
                        } else if (sessionActive) {
                            placeBet = true;
                            target = customTarget;
                            logMsg += `[狀態: ${statusStr}] 繼續下注: ${target}, 金額: ${bet}. `;
                        } else {
                            // 檢查觸發
                            if (lastResults.length >= N) {
                                const slice = lastResults.slice(-N);
                                const matchedTrigger = custom.triggerTargets.find(t => {
                                    return slice.every(r => checkMatch(r, t));
                                });

                                if (matchedTrigger) {
                                    sessionActive = true;
                                    placeBet = true;
                                    bet = cfg.baseBet;
                                    trackedTriggerType = matchedTrigger;

                                    if (custom.betAction === 'FOLLOW') {
                                        customTarget = matchedTrigger;
                                    } else {
                                        customTarget = custom.betAction;
                                    }
                                    target = customTarget;
                                    logMsg += `[觸發!] 發現連續 ${N} 個 ${matchedTrigger}. 啟動策略 -> 下注: ${target}, 金額: ${bet}. `;
                                } else {
                                    logMsg += `[狀態: ${statusStr}] 近 ${N} 局未滿足條件. `;
                                }
                            } else {
                                logMsg += `[狀態: ${statusStr}] 樣本不足 ${N} (目前 ${lastResults.length}). `;
                            }
                        }
                    } else {
                        placeBet = true;
                        target = 'P';
                        logMsg += `[標準策略] 下注: P, 金額: ${bet}. `;
                    }

                    // 執行發牌
                    const res = runHand(shoe);
                    if (!res) break;

                    addLog(logMsg + `開牌: ${res.w} (BP:${res.bp ? 'Y':'N'}, PP:${res.pp ? 'Y':'N'}, L6:${res.l6 ? 'Y':'N'})`);

                    total++;
                    if (res.w === 'B') counts.B++;
                    if (res.w === 'P') counts.P++;
                    if (res.w === 'T') counts.T++;
                    if (res.bp) counts.BP++;
                    if (res.pp) counts.PP++;
                    if (res.l6) counts.L6++;
                    
                    if (cfg.name === 'custom') {
                        lastResults.push(res);
                        if (lastResults.length > 20) lastResults.shift(); 
                        
                        if (waitForBreak && trackedTriggerType) {
                            if (!checkMatch(res, trackedTriggerType)) {
                                addLog(`>>> 斷路確認! 開出 ${res.w} 與鎖定類型 ${trackedTriggerType} 不同. 解除鎖定.`);
                                waitForBreak = false; 
                                trackedTriggerType = null;
                            } else {
                                addLog(`... 尚未斷路 (仍是 ${trackedTriggerType}). 繼續等待.`);
                            }
                        }
                    }

                    if (placeBet && target) {
                        betCount++;
                        let win = false;
                        let tie = false;

                        if (target === 'P') { win = res.w === 'P'; tie = res.w === 'T'; }
                        else if (target === 'B') { win = res.w === 'B'; tie = res.w === 'T'; }
                        else if (target === 'T') { win = res.w === 'T'; }
                        else if (target === 'BP') { win = res.bp; }
                        else if (target === 'PP') { win = res.pp; }
                        else if (target === 'L6') { win = res.l6; }

                        if (tie) {
                            ties++;
                            addLog(`結果: 和局退款. 餘額: ${bal}`);
                        } else if (win) {
                            wins++;
                            const payout = getPayout(target, res.l6);
                            const profit = bet * (payout - 1);
                            bal += profit;
                            addLog(`結果: 贏! 獲利: +${profit.toFixed(1)}. 餘額: ${bal.toFixed(1)}`);

                            if (cfg.name === 'martingale') bet = cfg.baseBet;
                            else if (cfg.name === 'paroli') {
                                paroliStep++;
                                bet = (paroliStep >= 3) ? cfg.baseBet : bet * 2;
                                if(paroliStep >=3) paroliStep = 0;
                            }
                            else if (cfg.name === 'fibonacci') {
                                fibIdx = Math.max(0, fibIdx - 2);
                                bet = cfg.baseBet * fibSeq[fibIdx];
                            }
                            else if (cfg.name === 'custom' && custom) {
                                if (custom.mode === 'WIN_CHASE') {
                                    bet = cfg.baseBet; 
                                    addLog(`[策略] 追勝模式: 贏了繼續追.`);
                                } else if (custom.mode === 'LOSS_CHASE') {
                                    sessionActive = false;
                                    waitForBreak = true;
                                    bet = cfg.baseBet;
                                    addLog(`[策略] 負追模式: 贏了(回本). 停止下注, 進入等待斷路.`);
                                } else { // ONCE
                                    sessionActive = false;
                                    waitForBreak = true;
                                    addLog(`[策略] 單次模式: 結束. 進入等待斷路.`);
                                }
                            }

                        } else {
                            losses++;
                            bal -= bet;
                            addLog(`結果: 輸! 損失: -${bet}. 餘額: ${bal.toFixed(1)}`);

                            if (cfg.name === 'martingale') bet *= 2;
                            else if (cfg.name === 'paroli') {
                                bet = cfg.baseBet;
                                paroliStep = 0;
                            }
                            else if (cfg.name === 'fibonacci') {
                                fibIdx = Math.min(fibSeq.length - 1, fibIdx + 1);
                                bet = cfg.baseBet * fibSeq[fibIdx];
                            }
                            else if (cfg.name === 'custom' && custom) {
                                if (custom.mode === 'WIN_CHASE') {
                                    sessionActive = false;
                                    waitForBreak = true; 
                                    bet = cfg.baseBet;
                                    addLog(`[策略] 追勝模式: 輸了(斷龍). 停止下注, 進入等待斷路.`);
                                } else if (custom.mode === 'LOSS_CHASE') {
                                    bet *= getMartingaleMultiplier(target);
                                    addLog(`[策略] 負追模式: 輸了. 下注倍投 -> ${bet}.`);
                                } else { // ONCE
                                    sessionActive = false;
                                    waitForBreak = true;
                                    addLog(`[策略] 單次模式: 結束. 進入等待斷路.`);
                                }
                            }
                        }
                    }

                    history.push(bal);
                    if (bal <= 0) break;
                    if (bet > bal) bet = bal;
                    if (bet < cfg.baseBet) bet = cfg.baseBet; 
                }
                if (bal <= 0) { bal = 0; break; }
            }

            resolve({
                total, betCount, wins, losses, ties, endBal: bal, history, counts, maxDD: 0, logs
            });
        }, 50); 
    });
};