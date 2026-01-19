import {create} from 'zustand';
import {NS,V,NP,NB,type C} from './L';
type K='p'|'b'|'t'|'pp'|'bp'|'l6';

export interface Res {w:'P'|'B'|'T'; p:boolean; b:boolean; s:number; isL6:boolean} 

interface St{s:C[];ph:C[];bh:C[];bal:number;bts:Record<K,number>;st:number;rs:string;wa:number;auto:boolean;cd:number;chip:number;history:Res[];spd:number;cutPos:number;ini:()=>void;go:()=>Promise<void>;add:(k:K)=>void;clr:()=>void;togAuto:()=>void;setChip:(v:number)=>void;setSpd:(v:number)=>void;autoLoop:()=>Promise<void>}

let getSpd = () => 1;
const sl=(ms:number)=>new Promise(r=>setTimeout(r,ms/getSpd()));

// [修改] 獲取隨機牌靴設定 (6-8副)
const getNewShoe = () => {
    const decks = Math.floor(Math.random() * 3) + 6; // 6, 7, 8
    const totalCards = decks * 52;
    const cards = NS(decks);
    // 切牌點：從最後 12 張 到 總張數的50% 之間
    const cutPos = Math.floor(Math.random() * ((totalCards / 2) - 12 + 1)) + 12;
    return { s: cards, cutPos };
};

export const useS=create<St>((set,get)=>({
s:[],ph:[],bh:[],bal:100000,bts:{p:0,b:0,t:0,pp:0,bp:0,l6:0},st:0,rs:'',wa:0,auto:false,cd:0,chip:100,history:[],spd:1,cutPos:0,
ini:()=>{
    set(getNewShoe());
    getSpd = () => get().spd;
},
setChip:(v)=>set({chip:v}),
setSpd:(v)=>set({spd:v}),
togAuto:()=>{
const a=!get().auto;
set({auto:a});
if(a&&get().st===0)get().autoLoop();
},
add:(k)=>{
const {bal,st,chip}=get();
if(st===0&&bal>=chip)set(s=>({bal:s.bal-chip,bts:{...s.bts,[k]:s.bts[k]+chip}}));
},
clr:()=>set(s=>{
let r=0;Object.values(s.bts).forEach(v=>r+=v);
return{bal:s.bal+r,bts:{p:0,b:0,t:0,pp:0,bp:0,l6:0}}
}),
autoLoop:async()=>{
set({cd:5});
for(let i=5;i>0;i--){
if(!get().auto)return;
set({cd:i});
await sl(1000);
}
if(get().auto)get().go();
},
go:async()=>{
// 開局檢查：若無牌則初始化 (防呆)
let {s}=get();
if(s.length===0){ set(getNewShoe()); }

set({st:1,ph:[],bh:[],rs:'',wa:0,cd:0});

const draw = async () => {
    let { s, cutPos } = get();
    // 檢查是否觸及切牌點
    if (s.length <= cutPos) {
        await sl(500); 
        // [修改] 換靴時重新隨機 6-8 副
        const newShoe = getNewShoe();
        set({ ...newShoe, history: [] }); // 重置路單
        await sl(500);
        s = newShoe.s; // 更新本地變數以繼續發牌
    }
    const c = s.pop()!;
    set({ s });
    return c;
};

await sl(300); const p1 = await draw(); set(x=>({ph:[...x.ph, p1]}));
await sl(300); const b1 = await draw(); set(x=>({bh:[...x.bh, b1]}));
await sl(300); const p2 = await draw(); set(x=>({ph:[...x.ph, p2]}));
await sl(300); const b2 = await draw(); set(x=>({bh:[...x.bh, b2]}));

const pv=V(get().ph),bv=V(get().bh);
let p3:number|undefined;
if(pv<8&&bv<8){
    if(NP(pv)){
        await sl(800);
        const c = await draw();
        p3=c.v;
        set(x=>({ph:[...x.ph,c]}));
    }
    if(NB(bv,p3)){
        await sl(800);
        const c = await draw();
        set(x=>({bh:[...x.bh,c]}));
    }
}
await sl(1500);

const fp=V(get().ph),fb=V(get().bh);
let p=0, w=0, b=get().bts;
const winner = fp>fb ? 'P' : fb>fp ? 'B' : 'T'; 
const winScore = winner === 'P' ? fp : fb;
const isLucky6 = winner === 'B' && fb === 6;

if(winner==='P') {p+=b.p*2;w+=b.p*1;}
else if(winner==='B') {p+=b.b*1.95;w+=b.b*0.95;}
else {p+=b.t*9;w+=b.t*8;p+=b.p+b.b;}
const isPP = get().ph[0].r===get().ph[1].r;
const isBP = get().bh[0].r===get().bh[1].r;
if(isPP) {p+=b.pp*12;w+=b.pp*11;}
if(isBP) {p+=b.bp*12;w+=b.bp*11;}
if(fb===6) {p+=b.l6*13;w+=b.l6*12;}

set(x=>({
    st:2,
    bal:x.bal+p,
    wa:w,
    rs:winner==='P'?'閒贏':winner==='B'?'莊贏':'和',
    history: [...x.history, {w: winner, p: isPP, b: isBP, s: winScore, isL6: isLucky6}]
}));
await sl(3000);
set(s=>{return{st:0,bts:{p:0,b:0,t:0,pp:0,bp:0,l6:0},bal:s.bal,wa:0};});
if(get().auto)get().autoLoop();
}}));