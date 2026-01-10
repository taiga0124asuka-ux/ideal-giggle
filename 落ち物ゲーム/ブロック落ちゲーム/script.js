const COLS = 10, ROWS = 20, BS = 30, ctx = document.getElementById('game-board').getContext('2d');
const hCtx = document.getElementById('hold-canvas').getContext('2d'), nCtxs = Array.from({length:5}, (_, i) => document.getElementById(`next-canvas-${i+1}`).getContext('2d'));
const COLORS = ['#000', '#0FF', '#00F', '#F80', '#FF0', '#0F0', '#808', '#F00', '#888'];
const SHAPES = [[], [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[2,0,0],[2,2,2],[0,0,0]], [[0,0,3],[3,3,3],[0,0,0]], [[4,4],[4,4]], [[0,5,5],[5,5,0],[0,0,0]], [[0,6,0],[6,6,6],[0,0,0]], [[7,7,0],[0,7,7],[0,0,0]]];
const WK = {"0-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "1-0":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "1-2":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "2-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "2-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]], "3-2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "3-0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "0-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]]};
const WKI = {"0-1":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "1-0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "1-2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], "2-1":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "2-3":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "3-2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "3-0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "0-3":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]};

let board, cp, next = [], holdP, canH, score, lv, lines, speed, lastT, over, isRot;
const scr = document.getElementById('score'), lvd = document.getElementById('level');

// 修正：board[y+i][x+j] が 0（空）以外なら衝突とみなす判定
const isValid = (x, y, s = cp.shape) => s.every((r, i) => r.every((v, j) => !v || (x+j >= 0 && x+j < COLS && y+i < ROWS && (!board[y+i] || board[y+i][x+j] === 0))));

const dR = (c, x, y, s, x0=0, y0=0, sz=25) => {
    c.fillStyle = COLORS[s]; c.fillRect(x0+x*sz, y0+y*sz, sz-1, sz-1);
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.strokeRect(x0+x*sz, y0+y*sz, sz-1, sz-1);
};

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, COLS*BS, ROWS*BS);
    board.forEach((r, y) => r.forEach((v, x) => v && dR(ctx, x, y, v, 0, 0, BS)));
    if (!cp) return;
    let gy = cp.y; while (isValid(cp.x, gy+1)) gy++;
    cp.shape.forEach((r, i) => r.forEach((v, j) => v && (dR(ctx, cp.x+j, gy+i, 8, 0, 0, BS), dR(ctx, cp.x+j, cp.y+i, cp.color, 0, 0, BS))));
    drawPrv(holdP, hCtx); next.slice(0, 5).forEach((p, i) => drawPrv(p, nCtxs[i]));
}

function drawPrv(id, c) {
    c.setTransform(1,0,0,1,0,0); c.fillStyle = '#000'; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    if (!id) return;
    const s = SHAPES[id], x0 = (c.canvas.width - s[0].length*25)/2, y0 = (c.canvas.height - s.length*25)/2;
    s.forEach((r, i) => r.forEach((v, j) => v && dR(c, j, i, id, x0, y0)));
}

function gen() {
    if (next.length < 7) { let b = [1,2,3,4,5,6,7]; for(let i=6; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [b[i], b[j]] = [b[j], b[i]]; } next.push(...b); }
    const id = next.shift(); cp = { x:~~((COLS-SHAPES[id][0].length)/2), y:id==1?-2:-1, shape:SHAPES[id], color:id, rot:0 };
    if (!isValid(cp.x, cp.y)) over = true;
}

function lock() {
    cp.shape.forEach((r, i) => r.forEach((v, j) => v && cp.y+i>=0 && (board[cp.y+i][cp.x+j] = cp.color)));
    const isTS = cp.color==6 && isRot && [[0,0],[2,0],[0,2],[2,2]].filter(([x,y]) => cp.x+x<0 || cp.x+x>=COLS || cp.y+y>=ROWS || board[cp.y+y][cp.x+x]).length >= 3;
    let cl = 0; board = board.filter(r => r.some(v => !v) || !(cl++));
    while(board.length < ROWS) board.unshift(Array(COLS).fill(0));
    lines += cl; score += (isTS ? [400,800,1200,1600][cl] : [0,100,300,500,800][cl]) * lv;
    lv = ~~(lines/10)+1; speed = Math.max(100, 1000-(lv-1)*70);
    scr.innerText = score; lvd.innerText = lv; canH = true; isRot = false; gen();
}

const move = (dx, dy) => isValid(cp.x+dx, cp.y+dy) ? (cp.x+=dx, cp.y+=dy, isRot=false, true) : false;

function rotate(cw) {
    if (cp.color == 4) return;
    const old = cp.rot, nR = (old + (cw?1:3)) % 4, nS = cw ? cp.shape[0].map((_, i) => cp.shape.map(r => r[i]).reverse()) : cp.shape[0].map((_, i) => cp.shape.map(r => r[r.length-1-i]));
    const ks = (cp.color==1?WKI:WK)[`${old}-${nR}`];
    for (const [dx, dy] of ks) if (isValid(cp.x+dx, cp.y-dy, nS)) return (cp.x+=dx, cp.y-=dy, cp.shape=nS, cp.rot=nR, isRot=true);
}

const acts = { moveLeft:()=>move(-1,0), moveRight:()=>move(1,0), softDrop:()=>move(0,1), hardDrop:()=>{while(move(0,1));lock()}, rotateLeft:()=>rotate(0), rotateRight:()=>rotate(1), hold:()=>{if(!canH)return; if(holdP){[holdP,cp.color]=[cp.color,holdP]; cp.shape=SHAPES[cp.color]; cp.y=cp.color==1?-2:-1; cp.x=~~((COLS-cp.shape[0].length)/2)}else{holdP=cp.color;gen()} canH=false} };

document.addEventListener('keydown', e => { const k = {'a':'moveLeft','d':'moveRight','s':'softDrop',' ':'hardDrop','q':'rotateLeft','w':'rotateRight','x':'hold'}[e.key.toLowerCase()]; if(k && !over) acts[k](), draw(); });
['hold', 'rotate-left', 'rotate-right', 'hard-drop'].forEach(id => { const el = document.getElementById(`btn-${id}`); if(el) el.onclick = () => !over && (acts[id.replace(/-./g, x=>x[1].toUpperCase())](), draw()); });

function loop(t) { if(over) return (document.getElementById('final-score').innerText=score, document.getElementById('game-over-screen').classList.remove('hidden')); if(t-lastT > speed) move(0,1) || lock(), lastT=t; draw(); requestAnimationFrame(loop); }
window.startGame = () => { board = Array.from({length:ROWS},()=>Array(COLS).fill(0)); score=lines=0; lv=1; speed=1000; holdP=null; next=[]; canH=true; over=false; document.getElementById('game-over-screen').classList.add('hidden'); gen(); lastT=performance.now(); loop(lastT); };
startGame();