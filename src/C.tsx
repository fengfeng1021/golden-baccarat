import {motion} from 'framer-motion';
import {type C as CT} from './L';
import {useS} from './S'; // 引入 Store 以獲取速度

export const C = ({c, i}: {c: CT; i: number}) => {
  const spd = useS(s => s.spd); // 獲取當前倍速
  const isRed = c.s === '♥' || c.s === '♦';
  const displayRank = (r: number) => {
    if (r === 1) return 'A';
    if (r === 11) return 'J';
    if (r === 12) return 'Q';
    if (r === 13) return 'K';
    return r;
  };
  const rank = displayRank(c.r);

  return (
    <motion.div
      layout
      initial={{ x: '40vw', y: '-40vh', opacity: 0, scale: 0.2, rotate: 45 }}
      animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      transition={{ 
        type: 'spring', stiffness: 120, damping: 15,
        layout: { duration: 0.4 / spd }, // 動畫時間除以倍速
        delay: (i * 0.1) / spd           // 延遲時間除以倍速
      }}
      className="relative flex h-32 w-24 flex-col items-center justify-between rounded-xl border border-gray-300 bg-white p-2 shadow-2xl lg:h-48 lg:w-36"
    >
      <div className={`self-start text-xl font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
        {rank}
      </div>
      <div className={`text-5xl ${isRed ? 'text-red-600' : 'text-black'}`}>
        {c.s}
      </div>
      <div className={`self-end rotate-180 text-xl font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
        {rank}
      </div>
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5 pointer-events-none"></div>
      <div className="absolute inset-0 rounded-xl bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-30 pointer-events-none"></div>
    </motion.div>
  );
};