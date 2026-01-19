import { useState, useRef, useEffect } from 'react';

// --- 核心邏輯區 ---
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

const runHand = (shoe: {r: number, v: number}[]) => {
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
        
        if (p3v === -1) {
            if (bv <= 5) bDraw = true;
            else bDraw = false;
        }

        if (bDraw) {
            const b3 = shoe.pop()!;
            bHand.push(b3);
            bv = getPoint(bHand);
        }
    }

    const win = pv > bv ? 'P' : bv > pv ? 'B' : 'T';
    const pairP = p1.r === p2.r;
    const pairB = b1.r === b2.r;

    return { w: win, pp: pairP, bp: pairB };
};

// --- 圖表組件 (更新座標軸) ---
const Chart = ({ data, initialBal }: { data: number[], initialBal: number }) => {
    if (data.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center border border-white/10 rounded-xl bg-[#111] min-h-[300px]">
                <span className="text-6xl mb-4 grayscale opacity-50">📈</span>
                <span className="text-gray-500 font-bold text-lg">等待模擬數據...</span>
            </div>
        );
    }
    
    // 計算範圍：必須包含 0 (破產線) 和 initialBal (起始線) 和 data中的最大最小值
    const allValues = [...data, 0, initialBal];
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    
    const padding = (max - min) * 0.1 || 100;
    const yMax = max + padding;
    const yMin = min - padding;
    const range = yMax - yMin || 1;
    
    // 座標轉換函數
    const getY = (val: number) => 100 - ((val - yMin) / range) * 100;

    const getPoints = () => {
        const step = Math.max(1, Math.floor(data.length / 500));
        let path = "";
        for (let i = 0; i < data.length; i += step) {
            const x = (i / (data.length - 1)) * 100;
            const y = getY(data[i]);
            path += `${x},${y} `;
        }
        if ((data.length - 1) % step !== 0) {
            const x = 100;
            const y = getY(data[data.length-1]);
            path += `${x},${y} `;
        }
        return path;
    };

    const isWin = data[data.length - 1] >= initialBal;
    const lineColor = isWin ? '#4ade80' : '#f87171';
    const areaColor = isWin ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)';

    return (
        <div className="relative w-full h-full bg-[#111] rounded-xl border border-white/10 p-2 flex flex-col shrink-0 min-h-0">
            <div className="flex justify-between items-center mb-1 px-2 shrink-0">
                <span className="text-sm text-gray-400 font-bold tracking-wider">資金走勢圖</span>
                <div className="flex gap-4 text-xs font-mono font-bold">
                    <span className="text-gray-500">初始: ${initialBal.toLocaleString()}</span>
                    <span className={`${isWin ? 'text-green-400' : 'text-red-400'}`}>
                        最終: ${data[data.length-1].toLocaleString()}
                    </span>
                </div>
            </div>
            
            <div className="relative flex-1 w-full min-h-0 mb-6 ml-2">
                {/* Y軸標籤 */}
                <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-[10px] font-bold text-gray-500 font-mono pointer-events-none z-10 pr-2">
                    <span>{Math.round(yMax).toLocaleString()}</span>
                    <span>{Math.round(yMin).toLocaleString()}</span>
                </div>

                <div className="absolute inset-0 left-10 right-4 bottom-2 top-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* 網格 */}
                        <line x1="0" y1="0" x2="100" y2="0" stroke="#333" strokeWidth="0.5" strokeDasharray="2" vectorEffect="non-scaling-stroke"/>
                        <line x1="0" y1="100" x2="100" y2="100" stroke="#333" strokeWidth="0.5" strokeDasharray="2" vectorEffect="non-scaling-stroke"/>
                        
                        {/* 0 線 (破產線) - 紅色 */}
                        <line 
                            x1="0" y1={getY(0)} x2="100" y2={getY(0)} 
                            stroke="#ef4444" strokeWidth="1" strokeDasharray="0" opacity="0.6" vectorEffect="non-scaling-stroke" 
                        />
                        {/* 0 線標籤 (SVG text) */}
                        <text x="102" y={getY(0)} dy="3" fill="#ef4444" fontSize="3" fontWeight="bold" opacity="0.8">0</text>

                        {/* 初始資金線 - 灰色虛線 */}
                        <line 
                            x1="0" y1={getY(initialBal)} x2="100" y2={getY(initialBal)} 
                            stroke="#888" strokeWidth="1" strokeDasharray="4" opacity="0.5" vectorEffect="non-scaling-stroke" 
                        />

                        <polyline
                            fill="none"
                            stroke={lineColor}
                            strokeWidth="1.5"
                            points={getPoints()}
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <polygon
                            fill={areaColor}
                            points={`0,${getY(yMin)} ${getPoints()} 100,${getY(yMin)}`}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    
                    {/* X軸標籤 */}
                    <div className="absolute -bottom-5 left-0 w-full flex justify-between text-[10px] font-bold text-gray-500 font-mono">
                        <span>Start</span>
                        <span>{Math.floor(data.length / 2)}局</span>
                        <span>End</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- UI 組件 ---
const CustomSelect = ({ value, onChange, options, disabled = false }: { value: string, onChange: (v: string) => void, options: {l: string, v: string}[], disabled?: boolean }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
            <div 
                onClick={() => !disabled && setOpen(!open)}
                className="w-full h-10 md:h-12 bg-white/5 border border-white/10 rounded-lg px-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
            >
                <span className="text-white text-sm md:text-base font-bold truncate">{options.find(o => o.v === value)?.l || value}</span>
                <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
            </div>
            {open && (
                <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                    {options.map(o => (
                        <div 
                            key={o.v}
                            onClick={() => { onChange(o.v); setOpen(false); }}
                            className={`px-4 py-3 text-sm md:text-base font-bold cursor-pointer hover:bg-white/10 ${value === o.v ? 'text-[#FFD700] bg-white/5' : 'text-white'}`}
                        >
                            {o.l}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const NumberInput = ({ label, value, onChange, step = 1, min = 0 }: { label: string, value: number, onChange: (v: number) => void, step?: number, min?: number }) => (
    <div className="flex flex-col gap-1 w-full min-w-0">
        <label className="text-sm text-gray-300 font-bold tracking-wide ml-1">{label}</label>
        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden h-10 md:h-12 focus-within:border-[#FFD700] focus-within:ring-1 focus-within:ring-[#FFD700]/50 transition-all">
            <button 
                onClick={() => onChange(Math.max(min, value - step))}
                className="w-10 h-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white active:bg-white/20 transition-colors border-r border-white/5 text-xl font-bold"
            >
                －
            </button>
            <input 
                type="number" 
                value={value} 
                onChange={e => onChange(Number(e.target.value))}
                className="flex-1 w-0 bg-transparent text-center text-white font-mono font-bold text-base md:text-xl outline-none appearance-none"
            />
            <button 
                onClick={() => onChange(value + step)}
                className="w-10 h-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white active:bg-white/20 transition-colors border-l border-white/5 text-xl font-bold"
            >
                ＋
            </button>
        </div>
    </div>
);

const StatCard = ({ label, val, sub, color = "text-white" }: { label: string, val: string | number, sub?: string, color?: string }) => (
    <div className="flex flex-col justify-between bg-gradient-to-br from-white/5 to-transparent rounded-xl p-3 md:p-4 border border-white/5 shadow-sm relative overflow-hidden group hover:border-white/10 transition-all">
        <div className="flex justify-between items-start mb-2">
            <span className={`text-sm md:text-base font-black ${color}`}>{label}</span>
            {sub && (
                <span className={`text-xs md:text-sm font-bold font-mono px-2 py-1 rounded-full bg-black/60 border border-white/10 ${color}`}>
                    {sub}
                </span>
            )}
        </div>
        <div className="flex items-end gap-1">
            <span className={`text-2xl md:text-3xl font-black font-mono leading-none tracking-tight ${color}`}>{val}</span>
        </div>
    </div>
);

// --- 主組件 ---
export const Sim = ({ onClose }: { onClose: () => void }) => {
    const [strategy, setStrategy] = useState('martingale');
    const [target, setTarget] = useState('P');
    const [shoes, setShoes] = useState(50);
    const [bal, setBal] = useState(10000);
    const [baseBet, setBaseBet] = useState(100);
    const [chartData, setChartData] = useState<number[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [running, setRunning] = useState(false);

    const isDynamicStrategy = ['dynamic_example'].includes(strategy);

    useEffect(() => {
        if (isDynamicStrategy) {
            setTarget('AUTO'); 
        } else if (target === 'AUTO') {
            setTarget('P');
        }
    }, [strategy]);

    const runSim = async () => {
        setRunning(true);
        setTimeout(() => {
            const startTime = performance.now();
            let currentBal = bal;
            let currentBet = baseBet;
            const historyBal = [currentBal];
            
            let totalHands = 0;
            let bWin = 0, pWin = 0, tWin = 0;
            let bpCnt = 0, ppCnt = 0;
            let winCnt = 0, loseCnt = 0;

            const fibSeq = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
            let fibIdx = 0;
            let paroliStep = 0;

            for (let s = 0; s < shoes; s++) {
                const shoe = createShoe();
                const cutPos = Math.floor(Math.random() * (200 - 12 + 1)) + 12;

                while (shoe.length > cutPos) {
                    const res = runHand(shoe);
                    if (!res) break;

                    totalHands++;
                    if (res.w === 'B') bWin++;
                    if (res.w === 'P') pWin++;
                    if (res.w === 'T') tWin++;
                    if (res.bp) bpCnt++;
                    if (res.pp) ppCnt++;

                    if (res.w !== 'T') {
                        const won = target === 'AUTO' ? false : target === res.w;
                        
                        if (won) {
                            const payout = (target === 'B') ? 0.95 : 1;
                            const profit = currentBet * payout;
                            currentBal += profit;
                            winCnt++;
                            
                            if (strategy === 'martingale') {
                                currentBet = baseBet;
                            } else if (strategy === 'paroli') {
                                paroliStep++;
                                if (paroliStep >= 3) {
                                    currentBet = baseBet;
                                    paroliStep = 0;
                                } else {
                                    currentBet *= 2; 
                                }
                            } else if (strategy === 'fibonacci') {
                                fibIdx = Math.max(0, fibIdx - 2);
                                currentBet = baseBet * fibSeq[fibIdx];
                            }
                        } else {
                            currentBal -= currentBet;
                            loseCnt++;

                            if (strategy === 'martingale') {
                                currentBet *= 2;
                            } else if (strategy === 'paroli') {
                                currentBet = baseBet;
                                paroliStep = 0;
                            } else if (strategy === 'fibonacci') {
                                fibIdx = Math.min(fibSeq.length - 1, fibIdx + 1);
                                currentBet = baseBet * fibSeq[fibIdx];
                            }
                        }
                    }
                    
                    historyBal.push(currentBal);
                    if (currentBal <= 0) { currentBal = 0; break; }
                    if (currentBet > currentBal) currentBet = currentBal;
                }
                if (currentBal <= 0) break;
            }

            const getPct = (v: number) => totalHands > 0 ? ((v / totalHands) * 100).toFixed(1) + '%' : '0%';

            setStats({
                total: totalHands,
                b: { c: bWin, p: getPct(bWin) },
                p: { c: pWin, p: getPct(pWin) },
                t: { c: tWin, p: getPct(tWin) },
                bp: { c: bpCnt, p: getPct(bpCnt) },
                pp: { c: ppCnt, p: getPct(ppCnt) },
                win: { c: winCnt, p: getPct(winCnt) },
                lose: { c: loseCnt, p: getPct(loseCnt) },
                endBal: currentBal,
                net: currentBal - bal
            });
            setChartData(historyBal);
            setRunning(false);
            console.log(`Simulation finished in ${Math.round(performance.now() - startTime)}ms`);
        }, 50);
    };

    const strategies = [
        {l: '馬丁格爾倍投', v: 'martingale'},
        {l: '帕羅利過關', v: 'paroli'},
        {l: '費波那契數列', v: 'fibonacci'},
        {l: '均注策略', v: 'flat'},
    ];

    const targets = [
        {l: '投注閒家 (P)', v: 'P'},
        {l: '投注莊家 (B)', v: 'B'},
        {l: '自動判斷 (鎖定)', v: 'AUTO'},
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 overflow-hidden flex flex-col">
            {/* 主容器：限制最大寬高，滿屏 */}
            <div className="w-full max-w-[1600px] mx-auto bg-[#0a0a0a] border-x border-b lg:border border-[#333] lg:rounded-2xl shadow-2xl flex flex-col flex-1 h-full max-h-screen overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/10 bg-[#111] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-[#FFD700] rounded-full shadow-[0_0_15px_#FFD700]"></div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-widest">策略模擬器</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all text-2xl">✕</button>
                </div>

                {/* Controls */}
                <div className="p-4 md:p-6 border-b border-white/10 bg-[#0f0f0f] shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6 items-end">
                        <div className="flex flex-col gap-1 w-full lg:col-span-1">
                            <label className="text-sm text-gray-300 font-bold tracking-wide ml-1">使用策略</label>
                            <CustomSelect value={strategy} onChange={setStrategy} options={strategies} />
                        </div>
                        <div className="flex flex-col gap-1 w-full lg:col-span-1">
                            <label className="text-sm text-gray-300 font-bold tracking-wide ml-1">
                                {isDynamicStrategy ? '投注目標 (自動)' : '固定投注目標'}
                            </label>
                            <CustomSelect 
                                value={target} 
                                onChange={setTarget} 
                                options={targets} 
                                disabled={isDynamicStrategy} 
                            />
                        </div>
                        <NumberInput label="模擬牌靴數" value={shoes} onChange={setShoes} step={10} min={1} />
                        <NumberInput label="初始金額" value={bal} onChange={setBal} step={1000} min={100} />
                        <NumberInput label="單注金額" value={baseBet} onChange={setBaseBet} step={100} min={10} />
                        
                        <button 
                            onClick={runSim}
                            disabled={running}
                            className={`w-full h-10 md:h-12 bg-gradient-to-r from-[#FFD700] to-[#FFC000] hover:to-[#FFD700] text-black font-black text-lg rounded-lg shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all active:scale-95 transform mt-4 lg:mt-0 ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {running ? '計算中...' : '開始模擬'}
                        </button>
                    </div>
                </div>

                {/* Content - 使用 min-h-0 確保 Flexbox 正確處理溢出，避免被切掉 */}
                <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-[#050505] p-4 gap-4 overflow-hidden">
                    
                    {/* Left: Chart - 佔用剩餘空間，確保高度自適應 */}
                    <div className="flex-1 flex flex-col min-h-0 h-[40vh] lg:h-auto shrink-0">
                         {/* 傳入初始金額以繪製起始線 */}
                         <Chart data={chartData} initialBal={bal} />
                    </div>

                    {/* Right: Stats - 右側面板，內容過多時內部滾動 */}
                    <div className="w-full lg:w-[420px] bg-[#0c0c0c] border border-white/10 rounded-xl p-4 shrink-0 flex flex-col gap-4 overflow-hidden h-full">
                        {stats ? (
                            <>
                                <div className="grid grid-cols-2 gap-3 shrink-0">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="text-gray-400 text-sm font-bold mb-1">最終金額</div>
                                        <div className="text-[#FFD700] font-mono text-3xl font-black tracking-tight truncate">
                                            ${stats.endBal.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="text-gray-400 text-sm font-bold mb-1">純收益/虧損</div>
                                        <div className={`font-mono text-3xl font-black tracking-tight truncate ${stats.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {stats.net >= 0 ? '+' : ''}{stats.net.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 pb-2 min-h-0">
                                    <div className="col-span-2">
                                        <StatCard label="模擬總局數" val={stats.total} />
                                    </div>
                                    <StatCard label="莊贏" val={stats.b.c} sub={stats.b.p} color="text-red-500" />
                                    <StatCard label="閒贏" val={stats.p.c} sub={stats.p.p} color="text-blue-500" />
                                    <StatCard label="和局" val={stats.t.c} sub={stats.t.p} color="text-green-500" />
                                    <StatCard label="莊對" val={stats.bp.c} sub={stats.bp.p} color="text-red-400" />
                                    <StatCard label="閒對" val={stats.pp.c} sub={stats.pp.p} color="text-blue-400" />
                                    <StatCard label="獲勝局數" val={stats.win.c} sub={stats.win.p} color="text-green-400" />
                                    <StatCard label="虧損局數" val={stats.lose.c} sub={stats.lose.p} color="text-red-400" />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50 min-h-[300px]">
                                <div className="text-6xl">📊</div>
                                <div className="text-xl font-bold">請點擊開始模擬</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
            `}</style>
        </div>
    );
};