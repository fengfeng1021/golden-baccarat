import { useState, useRef, useEffect, useMemo } from 'react';
import { runSimulation, type StrategyConfig, type BetTarget } from './Strategy';

const Chart = ({ data, initialBal }: { data: number[], initialBal: number }) => {
    if (data.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center border border-white/10 rounded-xl bg-[#111] min-h-[200px]">
                <span className="text-4xl mb-2 grayscale opacity-50">📈</span>
                <span className="text-[#FFD700] font-bold text-sm">等待模擬數據...</span>
            </div>
        );
    }

    const height = 240;
    const allValues = [...data, 0, initialBal];
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    const range = max - min || 1;
    const yMax = max;
    const yMin = min;

    const getY = (val: number) => height - ((val - yMin) / range) * height;

    const points = useMemo(() => {
        const step = Math.max(1, Math.floor(data.length / 300));
        let p = "";
        for (let i = 0; i < data.length; i += step) {
            const x = (i / (data.length - 1)) * 100;
            const y = getY(data[i]);
            p += `${x},${y} `;
        }
        p += `100,${getY(data[data.length - 1])}`;
        return p;
    }, [data, yMin, range]);

    const isWin = data[data.length - 1] >= initialBal;
    const color = isWin ? '#4ade80' : '#f87171';
    const xTicks = Array.from({ length: 11 }, (_, i) => i * 10);

    return (
        <div className="relative w-full h-full bg-[#111] rounded-xl border border-white/10 p-2 flex flex-col min-h-[240px]">
            <div className="flex justify-between items-center mb-1 px-2">
                <span className="text-xs text-gray-400 font-bold">資金走勢</span>
                <div className="flex gap-3 text-[10px] font-mono font-bold">
                    <span className="text-gray-500">初始: ${initialBal.toLocaleString()}</span>
                    <span className={isWin ? 'text-green-400' : 'text-red-400'}>
                        最終: ${data[data.length - 1].toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="relative flex-1 w-full min-h-0 ml-8 mb-4">
                <div className="absolute top-0 -left-8 h-full flex flex-col justify-between text-[9px] text-gray-500 font-mono py-1 text-right w-7 pr-1">
                    <span>{Math.round(yMax / 1000)}k</span>
                    <span>{Math.round(initialBal / 1000)}k</span>
                    <span>{Math.round(yMin / 1000)}k</span>
                </div>

                <div className="absolute inset-0 border-l border-b border-white/5">
                    <svg viewBox={`0 0 100 ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <line x1="0" y1={getY(initialBal)} x2="100" y2={getY(initialBal)} stroke="#666" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
                        <line x1="0" y1={getY(0)} x2="100" y2={getY(0)} stroke="#ef4444" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />
                        <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />
                    </svg>
                </div>

                <div className="absolute -bottom-4 left-0 w-full flex justify-between text-[8px] text-gray-600 font-mono px-1">
                    {xTicks.map(t => <span key={t}>{t}%</span>)}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, val, sub, color = "text-white" }: { label: string, val: string | number, sub?: string, color?: string }) => (
    <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col justify-between hover:bg-white/10 transition-colors">
        <div className="flex justify-between items-start">
            <span className="text-xs text-gray-400 font-bold tracking-wide">{label}</span>
            {sub && <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 ${color} font-mono`}>{sub}</span>}
        </div>
        <span className={`text-xl font-mono font-black leading-none mt-2 ${color} tracking-tight`}>{val}</span>
    </div>
);

const CustomSelect = ({ label, value, onChange, options, disabled = false }: { label?: string, value: string, onChange: (v: string) => void, options: { l: string, v: string }[], disabled?: boolean }) => {
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
        <div className={`flex flex-col gap-1.5 w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
            {label && <label className="text-sm text-[#FFD700] font-bold ml-1 tracking-wider">{label}</label>}
            <div className="relative">
                <div
                    onClick={() => !disabled && setOpen(!open)}
                    className="w-full h-10 bg-[#1a1a1a] border border-white/20 rounded-lg px-3 flex items-center justify-between cursor-pointer hover:border-[#FFD700]/50 hover:bg-white/5 transition-all group"
                >
                    <span className="text-white text-sm font-bold truncate group-hover:text-[#FFD700] transition-colors">
                        {options.find(o => o.v === value)?.l || value}
                    </span>
                    <span className={`text-gray-500 text-xs transition-transform duration-200 ${open ? 'rotate-180 text-[#FFD700]' : ''}`}>▼</span>
                </div>
                {open && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.8)] z-50 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {options.map(o => (
                            <div
                                key={o.v}
                                onClick={() => { onChange(o.v); setOpen(false); }}
                                className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors border-b border-white/5 last:border-0 ${value === o.v ? 'text-[#FFD700] bg-white/10' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                            >
                                {o.l}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const NumberInput = ({ label, value, onChange, step = 1, min = 0 }: { label?: string, value: number, onChange: (v: number) => void, step?: number, min?: number }) => (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
        {label && <label className="text-sm text-[#FFD700] font-bold ml-1 tracking-wider">{label}</label>}
        <div className="flex items-center h-10 bg-[#1a1a1a] border border-white/20 rounded-lg overflow-hidden group focus-within:border-[#FFD700] focus-within:ring-1 focus-within:ring-[#FFD700]/30 transition-all shadow-sm">
            <button
                onClick={() => onChange(Math.max(min, value - step))}
                className="w-10 h-full flex items-center justify-center bg-white/0 hover:bg-white/10 text-gray-400 hover:text-white active:bg-white/20 transition-colors border-r border-white/10 text-sm font-bold"
            >
                －
            </button>
            <input
                type="number"
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="flex-1 w-0 bg-transparent text-center text-white font-mono font-bold text-sm outline-none appearance-none placeholder-gray-600"
            />
            <button
                onClick={() => onChange(value + step)}
                className="w-10 h-full flex items-center justify-center bg-white/0 hover:bg-white/10 text-gray-400 hover:text-white active:bg-white/20 transition-colors border-l border-white/10 text-sm font-bold"
            >
                ＋
            </button>
        </div>
    </div>
);

const CheckGroup = ({ options, selected, onChange }: { options: { l: string, v: BetTarget }[], selected: BetTarget[], onChange: (v: BetTarget[]) => void }) => (
    <div className="flex gap-2 flex-wrap">
        {options.map(o => {
            const isSel = selected.includes(o.v);
            return (
                <button
                    key={o.v}
                    onClick={() => {
                        if (isSel) onChange(selected.filter(x => x !== o.v));
                        else onChange([...selected, o.v]);
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all duration-200 ${isSel ? 'bg-[#FFD700] text-black border-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.3)]' : 'bg-transparent text-gray-400 border-white/20 hover:border-white/40 hover:text-white'}`}
                >
                    {o.l}
                </button>
            );
        })}
    </div>
);

export const Sim = ({ onClose }: { onClose: () => void }) => {
    const [shoes, setShoes] = useState(50);
    const [bal, setBal] = useState(10000);
    const [baseBet, setBaseBet] = useState(100);
    const [strategyName, setStrategyName] = useState('martingale');
    // [新增] 免傭模式開關 (預設開啟，符合現代賭場主流)
    const [noCommission, setNoCommission] = useState(true);

    const [trigCount, setTrigCount] = useState(4);
    const [trigTargets, setTrigTargets] = useState<BetTarget[]>(['P', 'B']);
    const [betAction, setBetAction] = useState<string>('FOLLOW');
    const [mode, setMode] = useState<'WIN_CHASE' | 'LOSS_CHASE' | 'ONCE'>('WIN_CHASE');

    const [tierCount, setTierCount] = useState(1);
    const [tierBets, setTierBets] = useState<number[]>([100]);

    useEffect(() => {
        setTierBets(prev => {
            const newArr = [...prev];
            if (tierCount > prev.length) {
                const lastVal = prev.length > 0 ? prev[prev.length - 1] : 100;
                for (let i = prev.length; i < tierCount; i++) {
                    newArr.push(lastVal * 2);
                }
            } else if (tierCount < prev.length) {
                return newArr.slice(0, tierCount);
            }
            return newArr;
        });
    }, [tierCount]);

    const updateTierBet = (idx: number, val: number) => {
        const newArr = [...tierBets];
        newArr[idx] = val;
        setTierBets(newArr);
    };

    const [res, setRes] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        setLoading(true);
        const config: StrategyConfig = {
            name: strategyName,
            shoes,
            initialBal: bal,
            baseBet,
            noCommission, // 傳遞免傭設定
            custom: strategyName === 'custom' ? {
                triggerCount: trigCount,
                triggerTargets: trigTargets,
                betAction: betAction as any,
                mode,
                tierBets
            } : undefined
        };

        const result = await runSimulation(config);
        setRes(result);
        setLoading(false);
    };

    const downloadLog = () => {
        if (!res || !res.logs) return;
        const blob = new Blob([res.logs.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation_log_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const strategies = [
        { l: '馬丁格爾 (Martingale)', v: 'martingale' },
        { l: '帕羅利 (Paroli)', v: 'paroli' },
        { l: '費波那契 (Fibonacci)', v: 'fibonacci' },
        { l: '平注 (Flat)', v: 'flat' },
        { l: '★ 自訂策略 (Custom)', v: 'custom' },
    ];

    const targetOptions: { l: string, v: BetTarget }[] = [
        { l: '閒', v: 'P' },
        { l: '莊', v: 'B' },
        { l: '和', v: 'T' },
        { l: '莊對', v: 'BP' },
        { l: '閒對', v: 'PP' },
        { l: '幸運6', v: 'L6' },
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto lg:overflow-hidden">
            <div className="w-full min-h-screen lg:h-screen flex flex-col p-2 lg:p-6">
                <div className="w-full max-w-[1400px] mx-auto bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl flex flex-col flex-1 lg:overflow-hidden">

                    <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-[#111]">
                        <h2 className="text-lg font-black text-white tracking-widest flex items-center gap-2">
                            <span className="text-xl">📊</span> 策略模擬器
                        </h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors">✕</button>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                        <div className="w-full lg:w-[360px] bg-[#0f0f0f] border-r border-white/10 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6 shrink-0">

                            <div className="space-y-4">
                                <h3 className="text-sm text-[#FFD700] font-black uppercase tracking-widest border-b border-[#FFD700]/20 pb-2">基礎設定</h3>
                                <CustomSelect label="策略選擇" value={strategyName} onChange={setStrategyName} options={strategies} />
                                <div className="grid grid-cols-2 gap-4">
                                    <NumberInput label="模擬牌靴" value={shoes} onChange={setShoes} step={10} min={1} />
                                    <NumberInput label="初始本金" value={bal} onChange={setBal} step={1000} min={100} />
                                </div>
                                <NumberInput label="基礎注碼" value={baseBet} onChange={setBaseBet} step={100} min={10} />

                                {/* [新增] 免傭模式開關 */}
                                <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border ${noCommission ? 'bg-[#FFD700]/10 border-[#FFD700]/50' : 'bg-[#1a1a1a] border-white/10'}`}>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${noCommission ? 'text-[#FFD700]' : 'text-gray-300'}`}>免傭百家樂</span>
                                        <span className="text-[10px] text-gray-500">莊賠 1:1 (莊6點賠50%)</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${noCommission ? 'bg-[#FFD700]' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-black transition-transform duration-200 ${noCommission ? 'left-6' : 'left-1'}`} />
                                        <input type="checkbox" checked={noCommission} onChange={e => setNoCommission(e.target.checked)} className="hidden" />
                                    </div>
                                </label>
                            </div>

                            {strategyName === 'custom' && (
                                <div className="space-y-5 animate-in slide-in-from-left-5 duration-300">
                                    <h3 className="text-sm text-[#FFD700] font-black uppercase tracking-widest border-b border-[#FFD700]/20 pb-2">自訂規則</h3>

                                    <div className="bg-[#161616] p-4 rounded-xl border border-white/10 space-y-4">
                                        <div className="text-sm text-[#FFD700] font-bold flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-[#FFD700]">1</span>
                                            觸發條件
                                        </div>
                                        <NumberInput label="連續出現次數" value={trigCount} onChange={setTrigCount} min={1} />
                                        <div className="flex flex-col gap-2">
                                            <span className="text-sm text-[#FFD700] font-bold ml-1 tracking-wider uppercase">監聽目標 (可複選)</span>
                                            <CheckGroup options={targetOptions} selected={trigTargets} onChange={setTrigTargets} />
                                        </div>
                                    </div>

                                    <div className="bg-[#161616] p-4 rounded-xl border border-white/10 space-y-4">
                                        <div className="text-sm text-[#FFD700] font-bold flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-[#FFD700]">2</span>
                                            執行動作
                                        </div>
                                        <CustomSelect
                                            label="下注對象"
                                            value={betAction}
                                            onChange={setBetAction}
                                            options={[{ l: '跟隨觸發目標', v: 'FOLLOW' }, ...targetOptions]}
                                        />
                                        <div className="text-xs text-gray-500 px-2 leading-relaxed">
                                            * 跟隨模式：若觸發條件是「閒」，則下注「閒」。
                                        </div>
                                    </div>

                                    <div className="bg-[#161616] p-4 rounded-xl border border-white/10 space-y-4">
                                        <div className="text-sm text-[#FFD700] font-bold flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-[#FFD700]">3</span>
                                            資金管理
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${mode === 'WIN_CHASE' ? 'bg-[#FFD700]/10 border-[#FFD700]/50' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                                <input type="radio" checked={mode === 'WIN_CHASE'} onChange={() => setMode('WIN_CHASE')} className="accent-[#FFD700] w-4 h-4" />
                                                <div className="flex flex-col w-full">
                                                    <span className={`text-sm font-bold ${mode === 'WIN_CHASE' ? 'text-[#FFD700]' : 'text-gray-400'}`}>追勝模式 (過關斬將)</span>
                                                    <span className="text-xs text-gray-500 mb-2">贏了繼續追，輸了停止 (抓長龍)</span>

                                                    {mode === 'WIN_CHASE' && (
                                                        <div className="mt-2 bg-black/40 rounded p-2 border border-white/5 animate-in fade-in slide-in-from-top-2">
                                                            <NumberInput label="設定級數 (關卡數)" value={tierCount} onChange={setTierCount} step={1} min={1} />
                                                            <div className="grid grid-cols-1 gap-2 mt-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                                {tierBets.map((val, idx) => (
                                                                    <NumberInput
                                                                        key={idx}
                                                                        label={`第 ${idx + 1} 關籌碼`}
                                                                        value={val}
                                                                        onChange={(v) => updateTierBet(idx, v)}
                                                                        step={100} min={10}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 mt-2 text-center">
                                                                * 全部通關後將循環回到第 1 關
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                            <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${mode === 'LOSS_CHASE' ? 'bg-[#FFD700]/10 border-[#FFD700]/50' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                                <input type="radio" checked={mode === 'LOSS_CHASE'} onChange={() => setMode('LOSS_CHASE')} className="accent-[#FFD700] w-4 h-4" />
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${mode === 'LOSS_CHASE' ? 'text-[#FFD700]' : 'text-gray-400'}`}>負追模式 (馬丁)</span>
                                                    <span className="text-xs text-gray-500">輸了倍投，贏了停止 (斷龍)</span>
                                                </div>
                                            </label>
                                            <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${mode === 'ONCE' ? 'bg-[#FFD700]/10 border-[#FFD700]/50' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                                <input type="radio" checked={mode === 'ONCE'} onChange={() => setMode('ONCE')} className="accent-[#FFD700] w-4 h-4" />
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${mode === 'ONCE' ? 'text-[#FFD700]' : 'text-gray-400'}`}>單次模式</span>
                                                    <span className="text-xs text-gray-500">觸發後只打一口，無論輸贏</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleRun}
                                disabled={loading}
                                className={`w-full py-4 mt-2 font-black rounded-xl text-base tracking-wider shadow-xl transition-all transform active:scale-[0.98] ${loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#FFD700] to-[#FFC000] hover:to-[#FFD700] text-black shadow-[#FFD700]/20'}`}
                            >
                                {loading ? '模擬運算中...' : '開始模擬'}
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 bg-[#050505] p-4 gap-4 overflow-y-auto lg:overflow-hidden">
                            <div className="flex-none h-[220px] lg:h-[35%] w-full">
                                <Chart data={res?.history || []} initialBal={bal} />
                            </div>

                            <div className="flex-1 min-h-0 flex flex-col">
                                <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                                    <span className="text-sm text-gray-500 font-bold uppercase tracking-widest ml-1">統計數據</span>
                                    {res?.logs && (
                                        <button
                                            onClick={downloadLog}
                                            className="text-xs font-bold text-[#FFD700] hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full border border-white/10"
                                        >
                                            <span>📥</span> 下載測試日誌
                                        </button>
                                    )}
                                </div>

                                {res ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-y-auto custom-scrollbar pb-2 pr-1">
                                        <StatCard label="總局數" val={res.total} />
                                        <StatCard label="下注次數" val={res.betCount} sub={`${((res.betCount / res.total) * 100).toFixed(1)}%`} />
                                        <StatCard label="最終金額" val={`$${res.endBal.toLocaleString()}`} color={res.endBal >= bal ? 'text-green-400' : 'text-red-400'} />
                                        <StatCard label="淨利/損" val={(res.endBal - bal).toLocaleString()} color={res.endBal >= bal ? 'text-green-400' : 'text-red-400'} />
                                        <StatCard label="勝率" val={`${((res.wins / (res.wins + res.losses || 1)) * 100).toFixed(1)}%`} />

                                        <div className="col-span-2 md:col-span-4 h-[1px] bg-white/5 my-1" />

                                        <StatCard label="閒贏 (P)" val={res.counts.P} sub={`${((res.counts.P / res.total) * 100).toFixed(1)}%`} color="text-blue-400" />
                                        <StatCard label="莊贏 (B)" val={res.counts.B} sub={`${((res.counts.B / res.total) * 100).toFixed(1)}%`} color="text-red-400" />
                                        <StatCard label="和局 (T)" val={res.counts.T} sub={`${((res.counts.T / res.total) * 100).toFixed(1)}%`} color="text-green-400" />
                                        <StatCard label="莊對" val={res.counts.BP} sub={`${((res.counts.BP / res.total) * 100).toFixed(1)}%`} color="text-red-400" />
                                        <StatCard label="閒對" val={res.counts.PP} sub={`${((res.counts.PP / res.total) * 100).toFixed(1)}%`} color="text-blue-400" />
                                        <StatCard label="幸運6" val={res.counts.L6} sub={`${((res.counts.L6 / res.total) * 100).toFixed(1)}%`} color="text-yellow-400" />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-700 font-bold border border-dashed border-white/10 rounded-xl gap-3 bg-white/[0.02]">
                                        <span className="text-5xl opacity-20">⚡</span>
                                        <span className="opacity-50">請設定左側參數並點擊「開始模擬」</span>
                                    </div>
                                )}
                            </div>
                        </div>
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