interface P{l:string;o:string;v:number;c:string;onClick:()=>void}
export const Z=({l,o,v,c,onClick}:P)=>(
<div onClick={onClick} className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border-4 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all active:scale-95 hover:brightness-110 ${c}`}>
<div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"/>
<span className="z-10 font-serif font-bold text-white drop-shadow-md leading-none">{l}</span>
<span className="z-10 mt-1 font-mono text-sm font-bold text-[#FFD700] drop-shadow-sm opacity-90">{o}</span>
{v>0&&<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"><div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#FFD700] bg-blue-600 text-sm font-bold text-white shadow-[0_0_10px_#FFD700]">${v}</div></div>}
</div>);