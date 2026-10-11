'use strict';
async function showPeg(){
 const resp=await fetch('data/taccel_peg_evidence.json');if(!resp.ok)throw new Error('근거 파일을 읽을 수 없습니다.');const e=await resp.json();
 const fields=[['원래 예제 완료',e.complete_example_and_output_sanity_pass?'통과':'미완료'],['유효 형상 프레임',String(e.usable_geometry_frames)],['실제 솔버 진입',e.solver_loop_entered?'관측':'미관측'],['산업 profile','미검증']];
 for(const [name,value] of fields){const card=document.createElement('div');card.className='card';const p=document.createElement('div');p.textContent=name;const v=document.createElement('div');v.className='value';v.textContent=value;card.append(p,v);document.querySelector('#metrics').append(card);}
 e.attempts.forEach((a,i)=>{const r=document.createElement('tr');const values=[String(i+1),i===0?'Open3D 누락으로 시작 전 실패':a.complete_example_and_output_sanity_pass?'전체 출력 검사 통과':a.termination_reason==='time_limit'?'고정 시간 한도에서 미완료':'원래 예제 미완료',String(a.observed_frames??0),a.seconds.toFixed(2)+'초'];values.forEach(x=>{const c=document.createElement('td');c.textContent=x;r.append(c);});document.querySelector('#attempts').append(r);});
 document.querySelector('#output-scope').textContent=`${e.usable_geometry_frames}개는 한 예제의 연속 형상 프레임이며 독립 제조 표본 수가 아닙니다. depth·normal·marker·RGB 촉각 생성은 관측하지 않았습니다. 전체 검사는 원래 200개 프레임과 시작·끝 운동을 요구합니다.`;
 document.querySelector('#gpu-scope').textContent=`전체 장치 관측 ${e.host_telemetry.observations}개 · 최소 잔여 ${e.host_telemetry.minimum_free_MiB} MiB · 최대 이용률 ${e.host_telemetry.maximum_utilization_percent}%. 공유 장치 조건을 기록한 관측입니다.`;
 document.querySelector('#revision').textContent='고정 코드: '+e.artifact_commit+' · 관측: '+e.created_utc+' · 공개 배포 미수행';document.querySelector('#load-state').textContent='실제 로그와 고정 조건에 연결된 관측입니다.';
}
showPeg().catch(e=>{document.querySelector('#load-state').textContent=e.message;});
