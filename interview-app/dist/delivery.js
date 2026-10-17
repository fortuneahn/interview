(function(root){
'use strict';
// Practice heuristics, not a validated assessment of emotion or employability.
function createTracker(){
 let samples=0,clipped=0,first=null,last=null,previous=null,gap=null,pauses=0,pauseMs=0,voicedMs=0,largestGap=0;
 return {sample(time,rms,clip=false){samples++;if(clip)clipped++;if(previous!==null)largestGap=Math.max(largestGap,time-previous);const dt=previous===null?0:Math.min(250,Math.max(0,time-previous));previous=time;if(rms>=0.015){voicedMs+=dt;if(first===null)first=time;if(gap!==null&&time-gap>=2000){pauses++;pauseMs+=time-gap;}gap=null;last=time;}else if(first!==null&&gap===null)gap=time;},snapshot(){return {samples,clipped,spanMs:first===null?0:Math.max(0,last-first),voicedMs,pauses,pauseMs,largestGap};}};
}
function assess(segments,text){
 const m=segments.reduce((a,s)=>({samples:a.samples+s.samples,clipped:a.clipped+s.clipped,spanMs:a.spanMs+s.spanMs,voicedMs:a.voicedMs+s.voicedMs,pauses:a.pauses+s.pauses,pauseMs:a.pauseMs+s.pauseMs,largestGap:Math.max(a.largestGap,s.largestGap)}),{samples:0,clipped:0,spanMs:0,voicedMs:0,pauses:0,pauseMs:0,largestGap:0});
 const chars=(text.match(/[가-힣]/g)||[]).length;const fillers=(text.match(/(?:^|[\s,.!?])(?:음+|어+|그+|저기|뭐랄까)(?=$|[\s,.!?])/g)||[]).length;
 const repeats=(text.match(/([가-힣]{2,})(?:\s+\1)(?=$|[\s,.!?])/g)||[]).length;
 const rate=m.spanMs?Math.round(chars*60000/m.spanMs):0,ratio=m.spanMs?m.pauseMs/m.spanMs:0;
 const metrics={durationSeconds:Math.round(m.spanMs/100)/10,longPauses:m.pauses,pausePercent:Math.round(ratio*100),fillers,repeats,charactersPerMinute:rate};
 if(m.spanMs<8000||m.voicedMs<3000||chars<20||m.samples<60)return {available:false,metrics,notes:['음성 표본이 부족해 말하기 흐름 점수를 반영하지 않았습니다. 15초 이상 구체적으로 답해 보세요.']};
 if(m.clipped/m.samples>.02||m.largestGap>1500)return {available:false,metrics,notes:['마이크 과입력 또는 측정 지연이 있어 말하기 흐름을 채점하지 않았습니다. 마이크 위치와 브라우저 상태를 확인해 주세요.']};
 let score=4;const notes=[];
 if(m.pauses>=2){score-=m.pauses>=4?2:1;notes.push(`답변 중 2초 이상 멈춤이 ${m.pauses}회 있었습니다. 핵심어 세 개를 정리한 뒤 한 문장씩 이어 말해 보세요.`);}
 if(m.pauses>=2&&ratio>=.35){score--;notes.push(`측정한 발화 구간의 ${metrics.pausePercent}%가 긴 중간 침묵이었습니다. 문장 사이에는 짧게 쉬고, 다음 행동을 연결해 보세요.`);}
 if(fillers>=3&&fillers*100/Math.max(chars,1)>=3){score--;notes.push(`인식된 답변에 ‘음·어·그’ 등의 표현이 ${fillers}회 있었습니다. 군더더기 대신 짧게 숨을 고르고 결론부터 말해 보세요.`);}
 if(repeats>=2){score--;notes.push(`같은 단어의 연속 반복이 ${repeats}곳에서 확인됐습니다. 문장을 짧게 나누고 한 번씩 또렷하게 말해 보세요.`);}
 if(m.spanMs>=15000&&chars>=40&&(rate<100||rate>500)){score--;notes.push(`말속도가 분당 한글 ${rate}자였습니다. ${rate>500?'문장 끝에서 짧게 쉬며 속도를 낮춰':'핵심 문장을 미리 정리해 지나치게 늘어지지 않게'} 연습해 보세요.`);}
 if(!notes.length)notes.push('이 연습 기준에서 잦은 긴 멈춤·군더더기·연속 반복이 두드러지지 않았습니다. 현재 흐름을 유지하며 핵심 행동을 또렷하게 전달해 보세요.');
 notes.push('이 수치는 연습용 추정치입니다. 감정·자신감·성격·목소리 떨림을 판정하지 않으며, 주변 소음과 음성 인식 오류의 영향을 받을 수 있습니다.');
 return {available:true,score:Math.max(1,score),metrics,notes};
}
function combine(result,delivery){const contentScore=result.score;if(!delivery?.available)return {...result,contentScore,delivery};const score=contentScore===1?1:Math.round((contentScore*.8+delivery.score*.2)*10)/10;const labels=['','매우 불만족','불만족','만족','매우 만족'];return {...result,contentScore,score,label:labels[Math.max(1,Math.min(4,Math.round(score)))],delivery};}
class Monitor{
 constructor(){this.tracker=createTracker();this.stopped=false;this.interval=null;this.stream=null;this.context=null;this.source=null;this.start();}
 async start(){const AC=root.AudioContext||root.webkitAudioContext;if(!AC||!root.navigator?.mediaDevices?.getUserMedia)return;try{const stream=await root.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});if(this.stopped){stream.getTracks().forEach(t=>t.stop());return;}this.stream=stream;this.context=new AC();await this.context.resume();if(this.stopped)return;this.source=this.context.createMediaStreamSource(stream);const analyser=this.context.createAnalyser();analyser.fftSize=1024;this.source.connect(analyser);const data=new Float32Array(analyser.fftSize);this.interval=root.setInterval(()=>{if(this.context.state!=='running'||root.document.hidden)return;analyser.getFloatTimeDomainData(data);let sum=0,clip=false;for(const x of data){sum+=x*x;if(Math.abs(x)>.98)clip=true;}this.tracker.sample(Date.now(),Math.sqrt(sum/data.length),clip);},100);}catch{this.stop();}}
 stop(){if(!this.stopped){this.stopped=true;if(this.interval!==null)root.clearInterval(this.interval);this.source?.disconnect();this.stream?.getTracks().forEach(t=>t.stop());if(this.context)this.context.close().catch(()=>{});}return this.tracker.snapshot();}
}
root.DeliveryCore={createTracker,assess,combine,Monitor};if(typeof module!=='undefined')module.exports=root.DeliveryCore;
})(typeof window==='undefined'?globalThis:window);
