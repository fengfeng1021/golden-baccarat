import {useEffect, useState} from 'react';
import {useS} from './S';
import {C} from './C';
import {Z} from './Z';
import {V} from './L';
import {Roads} from './R';
import {Sim} from './Sim';
import {AutoUpdate} from './AutoUpdate';

const CH = ({v, s, set}: {v: number, s: number, set: (v: number) => void}) => {
  const bg = v === 100 ? 'bg-slate-300 border-slate-500 text-slate-800' : 
             v === 500 ? 'bg-purple-600 border-purple-400 text-white' : 
             v === 1000 ? 'bg-amber-500 border-amber-300 text-yellow-900' : 
             'bg-zinc-900 border-red-500 text-red-500';
  const isSelected = s === v;
  return (
    <button 
      onClick={() => set(v)} 
      className={`
        relative flex flex-col items-center justify-center rounded-full border-2 md:border-4 shadow-xl 
        transition-all duration-300 flex-shrink-0
        ${bg} 
        ${isSelected ? 'z-50 scale-110 ring-2 md:ring-4 ring-white shadow-[0_0_20px_white] -translate-y-1' : 'z-10 hover:scale-105 opacity-90'} 
        h-10 w-10 md:h-16 md:w-16
      `}
    >
      <span className="font-serif text-[8px] md:text-xs font-bold opacity-80">$</span>
      <span className="text-[8px] md:text-sm font-bold">{v >= 1000 ? v / 1000 + 'k' : v}</span>
    </button>
  );
};

const Shoe = ({count, cutPos}: {count: number, cutPos: number}) => {
    const max = 416; 
    const heightPct = Math.min((count / max) * 100, 100);
    const cutLineBottom = (cutPos / max) * 100;
    const playableCount = Math.max(0, count - cutPos);

    return (
        <div className="absolute top-4 right-4 z-30 hidden md:flex flex-col items-center gap-2">
            <div className="relative h-24 w-12 md:h-36 md:w-20 rounded-lg border-4 border-white/20 bg-black/30 shadow-2xl backdrop-blur-sm overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-20"/>
                <div className="absolute bottom-0 w-full bg-[#E0E0E0] transition-all duration-500 ease-out border-r-2 border-[#ccc]" style={{height: `${heightPct}%`}}>
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,#d1d1d1_1px,transparent_1px)] bg-[size:100%_3px] opacity-50"/>
                    <div 
                        className="absolute w-full h-[2px] bg-red-600 shadow-[0_0_8px_rgba(255,0,0,1)] z-10" 
                        style={{bottom: `${(cutLineBottom / heightPct) * 100}%`}} 
                    />
                </div>
                <div className="absolute top-0 right-0 h-full w-1/3 bg-white/5 pointer-events-none z-20"/>
                <div className="relative z-30 font-mono text-lg md:text-2xl font-black text-black/80 drop-shadow-md bg-white/30 px-1 rounded backdrop-blur-md border border-white/20">
                    {playableCount}
                </div>
            </div>
        </div>
    );
};

const SpeedControl = () => {
    const {spd, setSpd} = useS();
    const [open, setOpen] = useState(false);
    const speeds = [...Array.from({length: 10}, (_, i) => i + 1), 20, 50, 100];
    const currentIndex = speeds.indexOf(spd) !== -1 ? speeds.indexOf(spd) : 0;

    return (
        <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {open && (
                <div className="bg-black/80 backdrop-blur-md border border-[#FFD700]/30 rounded-xl p-4 mb-2 flex flex-col gap-2 w-16 items-center shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <span className="text-[#FFD700] font-bold font-mono text-lg">{spd}x</span>
                    <input 
                        type="range" 
                        min="0" 
                        max={speeds.length - 1} 
                        step="1"
                        value={currentIndex}
                        onChange={(e) => setSpd(speeds[parseInt(e.target.value)])}
                        className="h-32 w-2 appearance-none rounded-full bg-gray-600 outline-none writing-mode-vertical"
                        style={{writingMode: 'vertical-lr', direction: 'rtl'}}
                    />
                </div>
            )}
            <button 
                onClick={() => setOpen(!open)}
                className={`w-12 h-12 rounded-full border-2 border-[#FFD700] bg-black/60 text-[#FFD700] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all hover:scale-110 active:scale-95 ${open ? 'bg-[#FFD700] text-black' : ''}`}
            >
                {spd}x
            </button>
        </div>
    );
};

const SimButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <button 
            onClick={onClick}
            className="absolute bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full border border-white/20 bg-black/60 text-white font-bold shadow-lg hover:bg-white/10 hover:border-[#FFD700] hover:text-[#FFD700] transition-all active:scale-95 backdrop-blur-sm"
        >
            <span className="text-xl">📊</span>
            <span className="hidden md:inline">策略模擬</span>
        </button>
    );
};

export const T = () => {
  const {ph, bh, bal, bts, st, rs, wa, auto, cd, chip, history, ini, add, clr, togAuto, setChip, s, spd, cutPos} = useS();
  const [showSim, setShowSim] = useState(false);
  
  useEffect(() => { ini() }, []);
  const pVal = V(ph);
  const bVal = V(bh);

  // 判斷是否可以清除 (下注階段且有下注)
  const hasBet = Object.values(bts).some(v => v > 0);
  const canClear = st === 0 && hasBet;

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#003300] bg-[radial-gradient(circle_at_center,_#005500_0%,_#002200_100%)] text-[#F4E4BC] overflow-hidden">
      
      <AutoUpdate />
      <SpeedControl />
      <SimButton onClick={() => setShowSim(true)} />
      
      {showSim && <Sim onClose={() => setShowSim(false)} />}

      <div className="relative h-[45%] w-full shadow-[inset_0_-20px_40px_rgba(0,0,0,0.6)] z-20 overflow-hidden">
        <div className="absolute top-2 left-2 z-50 rounded-r-full border-l-4 border-[#FFD700] bg-black/60 pl-4 pr-6 py-2 font-mono text-lg md:text-2xl font-bold text-[#FFD700] backdrop-blur-md shadow-[5px_5px_15px_rgba(0,0,0,0.5)]">
           ${bal.toLocaleString()}
        </div>
        
        <Shoe count={s.length} cutPos={cutPos} />
        
        {auto && st === 0 && cd > 0 && (
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center animate-pulse scale-75 md:scale-100"
                style={{ animationDuration: `${1000/spd}ms` }}
            >
                <span className="text-4xl md:text-6xl font-black text-[#FFD700] mb-2 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] tracking-widest leading-none" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'}}>請下注</span>
                <span className="text-[10rem] md:text-[12rem] font-black text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] leading-none" style={{textShadow: '0 0 40px rgba(255, 215, 0, 0.5)'}}>
                    {cd}
                </span>
            </div>
        )}
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex w-full max-w-7xl items-center justify-between px-2 md:px-10 transition-transform duration-300 scale-[0.55] sm:scale-[0.65] md:scale-80 lg:scale-100 origin-center">
                <div className="flex flex-col items-center w-[45%]">
                    <h2 className="mb-2 text-4xl md:text-6xl font-bold text-blue-400 drop-shadow-[0_4px_12px_rgba(59,130,246,0.8)] tracking-widest">閒</h2>
                    <div className={`mb-4 flex h-14 min-w-[100px] items-center justify-center rounded-2xl border-2 border-blue-400/50 bg-black/50 px-8 text-3xl font-bold text-blue-300 backdrop-blur-md transition-all duration-500 ${ph.length > 0 ? 'opacity-100' : 'opacity-0'}`}>{pVal}</div>
                    <div className={`grid gap-4 perspective-1000 w-auto transition-all duration-500 ease-in-out min-h-[12rem] md:min-h-[16rem] ${ph.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {ph.map((c, i) => <div key={c.i} className="flex-shrink-0 relative z-10"><C c={c} i={i} /></div>)}
                    </div>
                </div>
                <div className="flex flex-col items-center w-[45%]">
                    <h2 className="mb-2 text-4xl md:text-6xl font-bold text-red-500 drop-shadow-[0_4px_12px_rgba(239,68,68,0.8)] tracking-widest">莊</h2>
                    <div className={`mb-4 flex h-14 min-w-[100px] items-center justify-center rounded-2xl border-2 border-red-500/50 bg-black/50 px-8 text-3xl font-bold text-red-300 backdrop-blur-md transition-all duration-500 ${bh.length > 0 ? 'opacity-100' : 'opacity-0'}`}>{bVal}</div>
                    <div className={`grid gap-4 perspective-1000 w-auto transition-all duration-500 ease-in-out min-h-[12rem] md:min-h-[16rem] ${bh.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {bh.map((c, i) => <div key={c.i} className="flex-shrink-0 relative z-10"><C c={c} i={i} /></div>)}
                    </div>
                </div>
            </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 w-full flex justify-center">
            {st === 2 && (
                <div 
                    className="flex flex-col items-center justify-center animate-bounce scale-[0.6] md:scale-100"
                    style={{ animationDuration: `${1/spd}s` }}
                >
                    <div className="whitespace-nowrap rounded-full px-12 py-4 text-6xl md:text-8xl font-black text-[#F4E4BC] backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black/40 border border-[#F4E4BC]/30 mb-4">
                        <span className="drop-shadow-[0_5px_5px_rgba(0,0,0,1)]">{rs}</span>
                    </div>
                    {wa > 0 && <div className="whitespace-nowrap rounded-3xl px-12 py-6 text-7xl md:text-9xl font-black text-[#FFFF00] backdrop-blur-md shadow-[0_0_100px_#FFD700,inset_0_0_30px_#FFD700] bg-black/60 border-4 border-[#FFD700] animate-pulse"><span className="drop-shadow-[0_10px_10px_rgba(0,0,0,1)] flex items-center gap-2"><span className="text-5xl md:text-7xl">+</span>${wa.toLocaleString()}</span></div>}
                </div>
            )}
        </div>
      </div>

      <div className="relative h-[55%] w-full z-30 bg-black/40 border-t border-[#FFD700]/20 backdrop-blur-md flex flex-col overflow-hidden">
        
        <div className="w-full flex justify-center border-b border-white/10 flex-none bg-gray-900/50 py-1">
            <Roads history={history} />
        </div>

        <div className="flex-1 w-full max-w-6xl mx-auto p-2 mb-1 flex flex-col justify-center min-h-0">
             <div className="grid grid-cols-3 grid-rows-[1fr_1.5fr] gap-2 h-full w-full">
                <Z l="閒對" o="1:11" v={bts.pp} c="rounded-tl-xl text-lg md:text-2xl bg-blue-900/60 hover:bg-blue-800/80 border-blue-400/50 h-full" onClick={()=>add('pp')}/>
                <Z l="幸運6" o="1:12" v={bts.l6} c="text-lg md:text-2xl bg-[#DAA520]/60 hover:bg-[#DAA520]/80 border-[#FFD700]/50 h-full" onClick={()=>add('l6')}/>
                <Z l="莊對" o="1:11" v={bts.bp} c="rounded-tr-xl text-lg md:text-2xl bg-red-900/60 hover:bg-red-800/80 border-red-400/50 h-full" onClick={()=>add('bp')}/>
                <Z l="閒" o="1:1" v={bts.p} c="rounded-bl-xl text-3xl md:text-6xl bg-blue-700/80 hover:bg-blue-600/90 border-blue-400 h-full" onClick={()=>add('p')}/>
                <Z l="和" o="1:8" v={bts.t} c="text-3xl md:text-6xl bg-green-700/80 hover:bg-green-600/90 border-green-400 h-full" onClick={()=>add('t')}/>
                <Z l="莊" o="1:0.95" v={bts.b} c="rounded-br-xl text-3xl md:text-6xl bg-red-700/80 hover:bg-red-600/90 border-red-400 h-full" onClick={()=>add('b')}/>
            </div>
        </div>

        <div className="w-full flex items-center justify-center gap-4 md:gap-8 pt-2 pb-4 overflow-visible shrink-0 bg-black/20 h-auto">
            <div className="flex gap-3 md:gap-6 px-2 z-50">
                
                {/* [新增] 清除按鈕 */}
                <button 
                    onClick={canClear ? clr : undefined}
                    className={`
                        relative flex flex-col items-center justify-center rounded-full border-2 md:border-4 shadow-xl 
                        transition-all duration-300 flex-shrink-0 h-10 w-10 md:h-16 md:w-16
                        ${canClear 
                            ? 'bg-red-600 border-red-400 text-white hover:scale-105 active:scale-95 cursor-pointer' 
                            : 'bg-gray-700 border-gray-600 text-gray-400 opacity-50 cursor-not-allowed'
                        }
                    `}
                >
                    <span className="text-[10px] md:text-sm font-bold">清除</span>
                </button>

                {[100, 500, 1000, 10000].map(v => <CH key={v} v={v} s={chip} set={setChip} />)}
            </div>
            <button onClick={togAuto} className={`
                flex flex-col items-center justify-center flex-shrink-0 z-40
                h-12 w-12 md:h-16 md:w-16 rounded-full border-2 md:border-4 
                shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 
                ${auto ? 'bg-red-600 border-red-400 shadow-[0_0_20px_red] animate-pulse' : 'bg-[#FFD700] border-white hover:scale-110'}
            `}>
                <span className="text-sm md:text-xl font-black text-black leading-none">{auto ? '停止' : '發牌'}</span>
            </button>
        </div>
      </div>
    </div>
  );
};