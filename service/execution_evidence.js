(function(root){
 'use strict';
 function runsFor(work,graph){
  const key=work.properties?.systematic_candidate_work_id;
  const ids=new Set([work.id]);
  if(key)graph.nodes.filter(n=>n.type==='Work'&&n.properties?.systematic_candidate_work_id===key).forEach(n=>ids.add(n.id));
  return graph.nodes.filter(n=>n.type==='ExecutionRun'&&ids.has(n.properties?.work_id));
 }
 function describe(work,graph){
  const runs=runsFor(work,graph);
  const observed=runs.filter(r=>r.properties.sample_generation_executed||r.properties.task_output_generated);
  const scientific=runs.some(r=>r.properties.R4_clean_start_pass===true);
  const industrial=runs.some(r=>r.properties.industrial_pass===true);
  return {runs,outputObserved:observed.length>0,scientific,industrial,
   label:observed.length?'신규 출력 관측 · 검증 범위 확인':runs.length?'사전 점검 기록 · 신규 출력 없음':'실행 기록 미확인',
   context:observed.length?`신규 출력이 관측된 실행 기록 ${observed.length}건이 있습니다. 같은 논문에 연결된 다른 감사 기록의 실행도 포함하므로 대상 모델·공정·조건을 각 이력에서 확인하세요. 기술 실행, 과학 검증, 산업 사용 자격은 별도 판정입니다.`:runs.length?'환경·의존성·접근 등 사전 점검 기록이 있습니다. 새 데이터나 모델 출력의 생성은 이 실행 이력에서 확인되지 않았습니다.':'이 기록에 연결된 자체 실행 이력이 없습니다. 공개 링크와 저자 보고만으로 재실행 또는 산업 직접사용을 판정하지 않습니다.'};
 }
 const api={runsFor,describe};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.ExecutionEvidence=api;
})(typeof window!=='undefined'?window:globalThis);
