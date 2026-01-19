// 產生一副牌 (52張)
const Deck = () => {
    const s = ['♠', '♥', '♣', '♦'];
    const r = Array.from({length: 13}, (_, i) => i + 1);
    return s.flatMap(suit => r.map(rank => ({s: suit, r: rank, v: rank > 9 ? 0 : rank})));
};

// 洗牌演算法 (Fisher-Yates)
export const Shuffle = (cards: any[]) => {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
};

// [修改] NS (New Shoe): 支援傳入副數 (decks)
export const NS = (decks: number = 8) => {
    const cards = Array.from({length: decks}).flatMap(() => Deck());
    return Shuffle(cards);
};

// 點數計算
export const V = (cards: C[]) => {
    let t = cards.reduce((a, c) => a + c.v, 0);
    return t % 10;
};

// 閒家補牌規則
export const NP = (v: number) => v < 6;

// 莊家補牌規則
export const NB = (bv: number, pv?: number) => {
    if (bv >= 7) return false;
    if (bv <= 2) return true;
    if (pv === undefined) return false; // 閒沒補，莊6不補 (這行其實在邏輯層被 pv<8&&bv<8 擋掉，但保留無妨)
    if (bv === 3) return pv !== 8;
    if (bv === 4) return pv !== 0 && pv !== 1 && pv !== 8 && pv !== 9;
    if (bv === 5) return pv >= 4 && pv <= 7;
    if (bv === 6) return pv === 6 || pv === 7;
    return false;
};

// 卡牌介面
export interface C {s: string; r: number; v: number; i?: number}