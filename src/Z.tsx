export const Z = ({ l, o, v, c, onClick }: { l: string, o: string, v: number, c: string, onClick: () => void }) => {
    return (
        <button 
            onClick={onClick} 
            className={`
                relative flex flex-col items-start justify-between p-2 md:p-3 
                transition-all duration-200 active:scale-[0.98] 
                overflow-hidden ${c}
            `}
        >
            {/* 文字標籤區 (置於頂層，確保可見) */}
            <div className="w-full flex justify-between items-start z-30 pointer-events-none">
                <span className="font-bold text-white drop-shadow-md">{l}</span>
                <span className="text-[10px] md:text-xs text-white/80 font-mono bg-black/30 px-1 rounded">{o}</span>
            </div>

            {/* 籌碼堆疊區 (絕對定位於中心，不模糊背景) */}
            {v > 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                     <div className="relative w-10 h-10 md:w-16 md:h-16 rounded-full border-4 border-dashed border-[#FFD700]/80 bg-black/80 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-in zoom-in duration-200">
                        <span className="text-[#FFD700] font-black text-[10px] md:text-sm font-mono">
                            {v >= 1000 ? (v/1000).toFixed(1).replace('.0','') + 'k' : v}
                        </span>
                     </div>
                </div>
            )}
            
            {/* 點擊回饋層 */}
            <div className="absolute inset-0 bg-white/0 hover:bg-white/10 transition-colors z-10" />
        </button>
    )
}