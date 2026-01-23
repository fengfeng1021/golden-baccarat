// --- 基礎型別定義 ---
export type HandResult = { w: 'P'|'B'|'T'; bp: boolean; pp: boolean; l6: boolean; bv: number }; // [修改] 加入 bv (莊家點數) 以供判定
export type BetTarget = 'P'|'B'|'T'|'BP'|'PP'|'L6';

export interface StrategyConfig {
    name: string;
    shoes: number;
    baseBet: number;
    initialBal: number;
    noCommission: boolean; // [新增] 免傭模式開關
    custom?: {
        triggerCount: number;       
        triggerTargets: BetTarget[];
        betAction: BetTarget | 'FOLLOW'; 
        mode: 'WIN_CHASE' | 'LOSS_CHASE' | 'ONCE'; 
        tierBets?: number[]; 
    };
}

export interface SimStats {
    total: number;
    wins: number;
    losses: number;
    ties: number;
    betCount: number;
    endBal: number;
    maxDD: number; 
    history: number[];
    counts: Record<string, number>;
    logs: string[];
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

    return { w, pp, bp, l6, bv };
};

// [修改] 賠率計算 (含免傭邏輯)
// 參數: 下注目標, 是否免傭, 莊家點數(用於判斷莊6)
const getPayout = (target: BetTarget, noComm: boolean, bv: number): number => {
    switch (target) {
        case 'P': return 2.0; // 閒永遠 1:1 (含本金2.0)
        case 'B': 
            if (noComm) {
                // 免傭模式
                // 莊贏且6點 -> 1賠0.5 (含本金1.5)
                if (bv === 6) return 1.5;
                // 其他莊贏 -> 1賠1 (含本金2.0)
                return 2.0;
            } else {
                // 標準模式 (抽水5%) -> 1賠0.95 (含本金1.95)
                return 1.95;
            }
        case 'T': return 9.0;
        case 'BP': 
        case 'PP': return 12.0;
        case 'L6': 
            // 幸運6通常是兩張牌12倍，三張牌20倍
            // 這裡簡化模擬，取一般期望值或固定 12 倍 (含本金13)
            return 13.0; 
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

            const logs: string[] = [];
            const addLog = (msg: string) => {
                if (total <= 200) { 
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
            let winChaseTierIndex = 0;

            for (let s = 0; s < cfg.shoes; s++) {
                const shoe = createShoe();
                const cutPos = Math.floor(Math.random() * (200 - 12 + 1)) + 12;

                lastResults = []; 
                sessionActive = false;
                waitForBreak = false;
                trackedTriggerType = null;
                winChaseTierIndex = 0;
                
                if (total <= 200) logs.push(`--- 第 ${s + 1} 靴開始 ---`);

                while (shoe.length > cutPos) {
                    let placeBet = false;
                    let logMsg = ""; 

                    if (cfg.name === 'custom' && custom) {
                        const N = custom.triggerCount;
                        let statusStr = waitForBreak ? "等待斷路中" : sessionActive ? "策略執行中" : "監聽中";
                        
                        if (waitForBreak) {
                            placeBet = false;
                            logMsg += `[狀態: ${statusStr}] 鎖定類型: ${trackedTriggerType}. 不下注. `;
                        } else if (sessionActive) {
                            placeBet = true;
                            target = customTarget;
                            logMsg += `[狀態: ${statusStr}] 繼續下注: ${target}, 金額: ${bet} (Lv.${winChaseTierIndex + 1}). `;
                        } else {
                            if (lastResults.length >= N) {
                                const slice = lastResults.slice(-N);
                                const matchedTrigger = custom.triggerTargets.find(t => {
                                    return slice.every(r => checkMatch(r, t));
                                });

                                if (matchedTrigger) {
                                    sessionActive = true;
                                    placeBet = true;
                                    trackedTriggerType = matchedTrigger;

                                    if (custom.betAction === 'FOLLOW') {
                                        customTarget = matchedTrigger;
                                    } else {
                                        customTarget = custom.betAction;
                                    }
                                    target = customTarget;

                                    if (custom.mode === 'WIN_CHASE' && custom.tierBets && custom.tierBets.length > 0) {
                                        winChaseTierIndex = 0; 
                                        bet = custom.tierBets[0];
                                    } else {
                                        bet = cfg.baseBet;
                                    }

                                    logMsg += `[觸發!] 連續${N}個${matchedTrigger}. 下注:${target}, 金額:${bet}. `;
                                } else {
                                    logMsg += `[狀態: ${statusStr}] 近 ${N} 局未滿足. `;
                                }
                            } else {
                                logMsg += `[狀態: ${statusStr}] 樣本不足 ${N}. `;
                            }
                        }
                    } else {
                        placeBet = true;
                        target = 'P';
                        logMsg += `[標準] 下注: P, 金額: ${bet}. `;
                    }

                    const res = runHand(shoe);
                    if (!res) break;

                    addLog(logMsg + `開: ${res.w} (莊${res.bv}點)`);

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
                                addLog(`>>> 斷路確認! 解除鎖定.`);
                                waitForBreak = false; 
                                trackedTriggerType = null;
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
                            addLog(`結果: 和局退款.`);
                        } else if (win) {
                            wins++;
                            // [修改] 計算賠率時傳入 noCommission 和 莊家點數(res.bv)
                            const payout = getPayout(target, cfg.noCommission, res.bv);
                            const profit = bet * (payout - 1);
                            bal += profit;
                            
                            // 特別記錄莊6半贏的情況
                            const isHalfWin = cfg.noCommission && target === 'B' && res.bv === 6;
                            addLog(`結果: ${isHalfWin ? '莊6贏半' : '贏'}! +${profit.toFixed(1)}. 餘額: ${bal.toFixed(0)}`);

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
                                    if (custom.tierBets && custom.tierBets.length > 0) {
                                        winChaseTierIndex++;
                                        if (winChaseTierIndex >= custom.tierBets.length) {
                                            winChaseTierIndex = 0;
                                            addLog(`[策略] 追勝全通關! 循環回 Lv.1`);
                                        } else {
                                            addLog(`[策略] 追勝成功! 晉級至 Lv.${winChaseTierIndex + 1}`);
                                        }
                                        bet = custom.tierBets[winChaseTierIndex];
                                    } else {
                                        bet = cfg.baseBet; 
                                    }
                                } else if (custom.mode === 'LOSS_CHASE') {
                                    sessionActive = false;
                                    waitForBreak = true;
                                    bet = cfg.baseBet;
                                    addLog(`[策略] 負追贏了. 停利等待斷路.`);
                                } else { 
                                    sessionActive = false;
                                    waitForBreak = true;
                                    addLog(`[策略] 單次結束. 等待斷路.`);
                                }
                            }

                        } else {
                            losses++;
                            bal -= bet;
                            addLog(`結果: 輸! -${bet}. 餘額: ${bal.toFixed(0)}`);

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
                                    winChaseTierIndex = 0;
                                    bet = custom.tierBets ? custom.tierBets[0] : cfg.baseBet;
                                    addLog(`[策略] 追勝輸了(斷龍). 停止並等待斷路.`);
                                } else if (custom.mode === 'LOSS_CHASE') {
                                    bet *= getMartingaleMultiplier(target);
                                    addLog(`[策略] 負追輸了. 倍投 -> ${bet}.`);
                                } else { 
                                    sessionActive = false;
                                    waitForBreak = true;
                                    addLog(`[策略] 單次結束. 等待斷路.`);
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