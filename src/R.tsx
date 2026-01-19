import { type Res } from './S';

// --- 樣式定義 ---
const BEAD_CLS = "w-[30px] h-[30px] border-r border-b border-gray-300 flex items-center justify-center shrink-0 bg-white relative";
const ROAD_CLS = "w-[20px] h-[20px] border-r border-b border-gray-200 flex items-center justify-center shrink-0 bg-white relative";

// --- 介面 ---
interface BigRoadCell {
    res: Res;
    ties: number;
    // 用於下三路計算的原始座標
    col: number;
    row: number;
}

// 下三路結果 (紅/藍)
type DerivedResult = 'Red' | 'Blue';

// --- 核心演算法 ---

/**
 * 1. 產生大路數據 (Big Road Data)
 * 回傳：矩陣 與 依序產生節點的列表(用於跑下三路)
 */
const getBigRoadData = (h: Res[]) => {
    const rows = 6;
    // 這裡用動態陣列，不限長度，最後再截取
    const matrix: (BigRoadCell | null)[][] = [];
    const sequence: BigRoadCell[] = []; // 依序記錄大路生成的每一步 (不含和局的更新，只含實體)
    
    let col = 0, row = 0, lastW = '';
    
    // 追蹤上一個非和局的位置 (處理和局掛載)
    let lastC = -1, lastR = -1;

    h.forEach((res) => {
        // 和局：不佔格，掛在上一顆子上
        if(res.w === 'T') {
            if (lastC !== -1 && matrix[lastC] && matrix[lastC][lastR]) {
                matrix[lastC][lastR]!.ties += 1;
            }
            return;
        }

        if(!matrix[col]) matrix[col] = Array(rows).fill(null);

        // 第一顆
        if (lastW === '') {
            const cell = { res, ties: 0, col, row: 0 };
            matrix[col][0] = cell;
            sequence.push(cell);
            lastW = res.w;
            lastC = col; lastR = 0;
            return;
        }

        // 同路 (往下)
        if (res.w === lastW) {
            if (row < rows - 1 && !matrix[col][row+1]) {
                row++;
            } else {
                col++; // 長龍轉彎
            }
        } 
        // 換路 (換列)
        else {
            col++; row = 0;
            while(matrix[col] && matrix[col][0]) col++;
        }

        if(!matrix[col]) matrix[col] = Array(rows).fill(null);
        
        const cell = { res, ties: 0, col, row };
        matrix[col][row] = cell;
        sequence.push(cell);
        
        lastW = res.w;
        lastC = col; lastR = row;
    });

    return { matrix, sequence };
};

/**
 * 2. 判斷下三路顏色
 * gap: 1=大眼仔, 2=小路, 3=蟑螂路
 */
const getDerivedColor = (matrix: (BigRoadCell | null)[][], cell: BigRoadCell, gap: number): DerivedResult | null => {
    const { col, row } = cell;
    
    // 規則 A: 換列時 (row === 0) -> 比較前一列與前 k 列的長度 (齊整=紅, 不齊=藍)
    if (row === 0) {
        // 必須要有足夠的列數才能開始比較
        // 例如大眼仔(k=1)需比較 col-1 與 col-2。所以 col 必須 >= 2 才能比對 (col是0-based, 實際上是第3列開始)
        // 使用者規則：大眼仔從第2列第2排(row=1)開始，或第3列第1排(row=0)。
        // 也就是 col (當前列索引) 必須 >= gap + 1
        if (col < gap + 1) return null;

        const prevColLen = getColLength(matrix, col - 1);
        const gapColLen = getColLength(matrix, col - gap - 1);
        
        return prevColLen === gapColLen ? 'Red' : 'Blue';
    } 
    // 規則 B: 非換列 (row > 0) -> 比較左邊前 k 列對應位置 (有子=紅, 無子=藍)
    else {
        // 大眼仔從第2列第2排開始 (col=1, row=1)。Gap=1。
        // 所以 col 必須 >= gap
        if (col < gap) return null;

        // 檢查 matrix[col - gap][row] 是否有子
        const targetCol = matrix[col - gap];
        const hasNode = targetCol && targetCol[row]; // 看看對應位置有沒有東西
        // 此外，如果 targetCol 該行是空的(長度 < row)，這是不齊整(藍)
        // 如果 targetCol 該行有子，這是齊整(紅)
        // 還有一個特殊情況：如果左邊沒子，但左上角也沒子？
        // 百家樂口訣：「有對有，無對無，長腳對跳」
        // 程式邏輯簡化版：
        // 1. 拍拍黐 (左邊有子) -> 紅
        // 2. 左邊沒子 -> 
        //    檢查左邊那列的長度。如果左邊那列長度 >= row，說明是"中空" (不可能發生在大路)
        //    實際上大路邏輯：如果左邊沒子，那就是藍。
        //    但是！如果左邊那列根本沒那麼長，也就是說目前的 row 已經超過了左邊那列的深度 -> 紅 (長龍齊整)
        //    不，正確邏輯是：
        //    Check matrix[col-gap][row]. Exist? -> Red.
        //    Not Exist? -> Check matrix[col-gap][row-1]. Exist? -> Blue. (左上角有，左邊無 -> 突出來了 -> 藍)
        //    Wait, "長腳對跳" means if previous col is short, and we extend, it's Red? 
        //    No, standard rule:
        //      - Look at (col-gap, row). Occupied? -> Red.
        //      - Empty? -> Look at (col-gap, row-1). Occupied? -> Blue.
        //      - Empty? (Wait, row-1 must be occupied if row is reached in big road? No)
        
        // 讓我們使用最通用的程式判讀法 (Main Road Logic):
        // 1. 檢查 (col-gap, row) 是否有值。有 -> 紅。
        // 2. 若無，檢查 (col-gap, row-1) 是否有值。有 -> 藍。
        // 3. 若無 (代表前一列很短)，則 -> 紅 (代表長龍跟隨)。
        
        if (hasNode) return 'Red';
        
        // 左邊無子。檢查左上
        const targetColPrevRow = targetCol && targetCol[row - 1];
        if (targetColPrevRow) return 'Blue';
        
        // 左上也都無子 (前列長度不足)
        return 'Red';
    }
};

// 輔助：獲取大路某一列的「深度」 (不包含長龍轉彎的虛擬深度，只算實際直落的格數)
// 在程式的 matrix 中，因為長龍轉彎會換 col，所以 matrix[c].length 其實不太準確。
// 我們需要計算的是「邏輯上的列長度」。
// 但在我們的 BigRoadGrid 實作中，長龍轉彎是直接換 col 存儲的。
// 這會導致 row=0 的比較邏輯變複雜。
// 修正：為了下三路計算，我們需要一個「邏輯矩陣」還原大路原本的長相？
// 不，標準下三路是基於「視覺上的大路」。也就是我們現在畫出來的這個矩陣。
// 所以直接計算 matrix[c] 的非空元素數量即可 (假設沒有空洞，大路特性)。
const getColLength = (matrix: (BigRoadCell | null)[][], colIdx: number) => {
    const col = matrix[colIdx];
    if (!col) return 0;
    // 計算非 null 的數量
    return col.filter(Boolean).length;
};

/**
 * 3. 產生下三路佈局矩陣 (排列成 3行 x N列)
 * 規則：由上而下，滿了或有子則往右 (類似大路，但只有3行)
 */
const getDerivedMatrix = (sequence: BigRoadCell[], bigRoadMatrix: (BigRoadCell | null)[][], gap: number, viewCols: number) => {
    const rows = 3; // 限制 3 行
    const matrix: (DerivedResult | null)[][] = [];
    let col = 0, row = 0;

    sequence.forEach(cell => {
        const res = getDerivedColor(bigRoadMatrix, cell, gap);
        if (!res) return; // 還沒開始

        if (!matrix[col]) matrix[col] = Array(rows).fill(null);

        // 簡單排列邏輯：有空位就放，到底就轉彎 (不像大路要看顏色)
        // 實際上路單排列：
        // 1. 如果前一個是同一路(雖下三路只有紅藍)，通常還是繼續往下畫？
        //    不，下三路通常是紅藍交錯就換列，紅連紅就往下。
        //    邏輯與大路相同：同色往下，異色換列。
        
        // 我們需要追蹤 lastColor
        // 由於閉包特性，我們需要一個外部變數記錄上一次放置的位置與顏色
        // 但這裡我們在迴圈內，需取得前一個放入的顏色。
        
        // 為了簡單，重新遍歷一次生成的結果序列來排版
    });
    
    // 重寫排版邏輯
    const results: DerivedResult[] = [];
    sequence.forEach(cell => {
        const res = getDerivedColor(bigRoadMatrix, cell, gap);
        if (res) results.push(res);
    });

    let lastColor = '';
    col = 0; row = 0;

    results.forEach(color => {
        if (!matrix[col]) matrix[col] = Array(rows).fill(null);

        if (lastColor === '') {
            matrix[col][0] = color;
            lastColor = color;
            return;
        }

        if (color === lastColor) {
            // 同色：往下，若滿則向右
            if (row < rows - 1 && !matrix[col][row+1]) {
                row++;
            } else {
                col++;
            }
        } else {
            // 異色：換列
            col++; row = 0;
            while(matrix[col] && matrix[col][0]) col++;
        }

        if(!matrix[col]) matrix[col] = Array(rows).fill(null);
        matrix[col][row] = color;
        lastColor = color;
    });

    // 截取顯示範圍 (向左捲動)
    const maxCols = matrix.length;
    const startCol = Math.max(0, maxCols - viewCols);
    
    return Array.from({length: viewCols}).map((_, i) => matrix[startCol + i] || Array(rows).fill(null));
};


// --- 組件實作 ---

const BeadGrid = ({h}: {h: Res[]}) => {
    const rows = 6;
    const cols = 8;
    const totalCols = Math.ceil(h.length / rows);
    const startCol = Math.max(0, totalCols - cols);

    return (
        <div className="flex flex-col border-t border-l border-gray-400 w-fit">
            <div className="flex">
                {Array.from({length: cols}).map((_, c) => (
                    <div key={c} className="flex flex-col">
                        {Array.from({length: rows}).map((_, r) => {
                            const realCol = startCol + c;
                            const idx = realCol * rows + r;
                            const data = h[idx];
                            let txt = '';
                            if (data) {
                                if (data.isL6) txt = '6';
                                else if (data.w === 'B') txt = '庄';
                                else if (data.w === 'P') txt = '闲';
                                else txt = '和';
                            }
                            return (
                                <div key={r} className={BEAD_CLS}>
                                    {data && (
                                        <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-[22px] text-white font-black leading-none shadow-sm
                                            ${data.w === 'P' ? 'bg-blue-600' : data.w === 'B' ? 'bg-red-600' : 'bg-green-600'}
                                        `}>
                                            <span className="-mt-[2px]">{txt}</span>
                                            {data.p && <div className="absolute right-0 bottom-0 w-2 h-2 bg-blue-600 rounded-full border border-white"/>}
                                            {data.b && <div className="absolute left-0 top-0 w-2 h-2 bg-red-600 rounded-full border border-white"/>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

// 大路組件
const BigRoadGrid = ({matrix}: {matrix: (BigRoadCell | null)[][]}) => {
    const rows = 6;
    const viewCols = 30;
    const maxCols = matrix.length;
    const startCol = Math.max(0, maxCols - viewCols);

    return (
        <div className="flex border-l border-gray-400 w-fit">
            {Array.from({length: viewCols}).map((_, i) => {
                const cIndex = startCol + i;
                const colData = matrix[cIndex] || Array(rows).fill(null);
                return (
                    <div key={i} className="flex flex-col">
                        {colData.map((data, r) => (
                            <div key={r} className={ROAD_CLS}>
                                {data && (
                                    <div className={`relative w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center
                                        ${data.res.w === 'P' ? 'border-blue-600 text-blue-600' : 'border-red-600 text-red-600'}
                                    `}>
                                        <span className="text-[14px] font-black leading-none -mt-[1px]">{data.res.s}</span>
                                        {data.res.p && <div className="absolute right-[-2px] bottom-[-2px] w-1.5 h-1.5 bg-blue-600 rounded-full"/>}
                                        {data.res.b && <div className="absolute left-[-2px] top-[-2px] w-1.5 h-1.5 bg-red-600 rounded-full"/>}
                                        {data.ties > 0 && <div className="absolute top-1/2 left-1/2 w-[120%] h-[2px] bg-green-600 -translate-x-1/2 -translate-y-1/2 -rotate-45 pointer-events-none"></div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

// 下三路通用組件
const LowerRoadGrid = ({type, data}: {type: 'BigEye' | 'Small' | 'Cockroach', data: (DerivedResult | null)[][]}) => {
    const rows = 3;
    // 雖然 data 已經截取過，但為了確保格線畫滿 10 格，我們再跑一次 map
    const cols = 10; 
    
    return (
        <div className="relative flex border-l border-gray-400 w-fit">
            {Array.from({length: cols}).map((_, c) => {
                const colData = data[c] || Array(rows).fill(null);
                return (
                    <div key={c} className="flex flex-col">
                        {colData.map((res, r) => (
                            <div key={r} className={ROAD_CLS}>
                                {res && (
                                    <>
                                        {/* 大眼仔: 空心圓 */}
                                        {type === 'BigEye' && (
                                            <div className={`w-[16px] h-[16px] rounded-full border-[1.5px] ${res === 'Red' ? 'border-red-600' : 'border-blue-600'}`}></div>
                                        )}
                                        {/* 小路: 實心圓 */}
                                        {type === 'Small' && (
                                            <div className={`w-[16px] h-[16px] rounded-full ${res === 'Red' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
                                        )}
                                        {/* 蟑螂路: 斜線 */}
                                        {type === 'Cockroach' && (
                                            <div className={`w-[14px] h-[2px] rounded-full transform -rotate-45 ${res === 'Red' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

const Stats = ({h}: {h: Res[]}) => {
    const b = h.filter(x => x.w === 'B').length;
    const p = h.filter(x => x.w === 'P').length;
    const t = h.filter(x => x.w === 'T').length;
    const bp = h.filter(x => x.b).length;
    const pp = h.filter(x => x.p).length;
    const total = h.length;

    const Item = ({l, v, c, isRoad}: {l: string, v?: number | string, c: string, isRoad?: boolean}) => (
        <div className="flex-1 flex justify-between items-center w-full text-[11px] px-1 border-b border-white/10 last:border-0">
            <span className={`${isRoad ? 'text-[10px]' : 'text-gray-400 font-medium'}`}>{l}</span>
            {v !== undefined && <span className={`font-bold ${c}`}>{v}</span>}
            {isRoad && (
                <div className="flex gap-0.5">
                     <div className={`w-2 h-2 rounded-full border ${c.replace('text', 'border')}`}></div>
                     <div className={`w-2 h-2 rounded-full ${c.replace('text', 'bg')}`}></div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col w-24 bg-[#1a1a1a] border-l border-t border-b border-gray-600 shrink-0 h-[180px]">
            <Item l="莊" v={b} c="text-red-500" />
            <Item l="閒" v={p} c="text-blue-500" />
            <Item l="和" v={t} c="text-green-500" />
            <Item l="莊對" v={bp} c="text-red-500" />
            <Item l="閒對" v={pp} c="text-blue-500" />
            <Item l="總數" v={total} c="text-[#FFD700]" />
            <Item l="莊問路" c="text-red-500" isRoad />
            <Item l="閒問路" c="text-blue-500" isRoad />
        </div>
    );
};

export const Roads = ({history}: {history: Res[]}) => {
    // 1. 計算大路數據
    const { matrix, sequence } = getBigRoadData(history);
    
    // 2. 計算下三路矩陣 (gap: 1=大眼, 2=小路, 3=蟑螂) (viewCols: 10)
    const bigEyeData = getDerivedMatrix(sequence, matrix, 1, 10);
    const smallData = getDerivedMatrix(sequence, matrix, 2, 10);
    const cockroachData = getDerivedMatrix(sequence, matrix, 3, 10);

    return (
        <div className="flex w-fit mx-auto bg-gray-100 select-none shadow-xl items-start">
            <BeadGrid h={history} />
            <div className="flex flex-col border-t border-gray-400 border-b">
                <BigRoadGrid matrix={matrix} />
                <div className="flex border-t border-gray-400">
                    <LowerRoadGrid type="BigEye" data={bigEyeData} />
                    <LowerRoadGrid type="Small" data={smallData} />
                    <LowerRoadGrid type="Cockroach" data={cockroachData} />
                </div>
            </div>
            <Stats h={history} />
        </div>
    );
};