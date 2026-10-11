'use strict';
async function showGeometry(){
 const response=await fetch('data/taccel_saved_geometry_integrated.json');if(!response.ok)throw new Error('요소 변형 근거를 읽을 수 없습니다.');const e=await response.json();
 if(e.observed_frames!==32||e.frames.length!==32||e.planned_frames!==200)throw new Error('프레임 근거의 범위를 확인해야 합니다.');
 const metrics=[['관측 프레임',String(e.observed_frames)],['요소 뒤집힘','미검출'],['원래 예제 완료','미완료'],['독립 물리·산업','미검증']];
 for(const [name,value] of metrics){const card=document.createElement('article');card.className='card';const label=document.createElement('div');label.textContent=name;const strong=document.createElement('div');strong.className='value';strong.textContent=value;card.append(label,strong);document.querySelector('#metrics').append(card);}
 const meanings=['관측 구간에서 J가 0 이하인 요소 0개','부품·센서 간 관통과 자기 교차 미평가','실측 힘·변위·마찰 비교 미평가','분리된 교정·실측 검증 미수행','조립 공차와 운영 시험 미수행'];
 e.qualification_layers.forEach((layer,i)=>{const row=document.createElement('tr');for(const value of [layer.label,i===0?'부분 진단 완료':'미평가',meanings[i]]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}document.querySelector('#layers').append(row);});
 function showFrame(){const index=Number(document.querySelector('#frame').value);const frame=e.frames[index];if(frame.frame_index!==index)throw new Error('프레임 순서가 일치하지 않습니다.');document.querySelector('#frame-label').textContent=String(index);const table=document.querySelector('#frame-values');table.replaceChildren();frame.mapped_sensor_blocks.forEach((block,i)=>{const row=document.createElement('tr');for(const value of ['센서 '+(i+1),block.minimum_J.toFixed(6),block.maximum_J.toFixed(6),block.rest_volume_weighted_mean_J.toFixed(6)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}table.append(row);});}
 document.querySelector('#frame').addEventListener('input',showFrame);showFrame();
 document.querySelector('#revision').textContent=`계획 v${e.plan_revision} · 원고 v${e.main_manuscript_revision} · 지식그래프 v${e.public_graph_revision} · 사후 분석 · 새 방법 실행 0건`;
 document.querySelector('#load-state').textContent='원래 실행과 분리된 사후 형상 분석입니다. 한 단계의 검사로 최종 제조 적격성을 올리지 않습니다.';
}
showGeometry().catch(error=>{document.querySelector('#load-state').textContent=error.message;});
