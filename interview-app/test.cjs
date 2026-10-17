const assert=require('node:assert/strict');
const bank=require('./dist/questions.js');const {selectQuestions,evaluate}=require('./dist/app.js');
assert.equal(bank.length,30);assert.equal(new Set(bank.map(x=>x.id)).size,30);
for(let i=0;i<100;i++){for(const size of [5,8,12,50]){const q=selectQuestions(bank,size);assert.equal(q.length,Math.min(size,bank.length));assert.equal(new Set(q.map(x=>x.id)).size,q.length);assert.equal(new Set(q.map(x=>x.category)).size,Math.min(size,6));}}
for(const q of bank){const sentences=q.model.split(/[.!?。]/).filter(s=>s.trim());assert.ok(sentences.length>=3&&sentences.length<=4,q.id);assert.equal(q.keys.length,3);assert.equal(q.criteria.length,3);const r=evaluate(q,q.model);assert.ok(r.score>=3,`${q.id}: model scored ${r.score}`);assert.equal(evaluate(q,'').score,1);assert.equal(evaluate(q,'오늘은 날씨가 정말 좋고 저는 점심으로 맛있는 음식을 먹고 왔습니다.').score,1);}
const meat=bank.find(q=>q.id==='meat');assert.equal(evaluate(meat,meat.model).score,4);assert.equal(evaluate(meat,'신고 절차를 안내하고 차분히 설명하겠습니다. 검역관에게 보고하지 않겠습니다.').score,1);
console.log('PASS: 30 question rubrics, model answers, random non-repeating balanced sessions, empty/off-topic/unsafe responses.');
