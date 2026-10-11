'use strict';
async function showAttempt(){
 const n=new URLSearchParams(location.search).get('attempt');if(!['1','2'].includes(n))throw new Error('시도 번호는 1 또는 2여야 합니다.');
 const response=await fetch(`data/taccel_peg_attempt${n}.json`);if(!response.ok)throw new Error('실행 기록을 읽을 수 없습니다.');const a=await response.json();
 document.querySelector('#title').textContent=`Taccel 실행 기록 ${n}`;
 document.querySelector('#summary').textContent=`종료 코드 ${a.exit_code} · 관측 형상 ${a.observed_frames}개 · 전체 예제 ${a.complete_example_and_output_sanity_pass?'통과':'미완료'} · controller 관측 ${a.seconds.toFixed(2)}초 · 종료 사유 ${a.termination_reason??'패키지 import 실패'}`;
 document.querySelector('#record').textContent=JSON.stringify(a,null,2);
}
showAttempt().catch(e=>{document.querySelector('#summary').textContent=e.message;});
