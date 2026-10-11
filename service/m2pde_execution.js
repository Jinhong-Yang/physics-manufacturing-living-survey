'use strict';
const el=id=>document.getElementById(id),pct=n=>(100*n).toFixed(2)+'%';
fetch('data/m2pde_execution_integrated.json').then(r=>{if(!r.ok)throw Error('load');return r.json();}).then(data=>{
 const a=data.analysis;el('outputs').textContent=a.primary_completed+'개';
 const variants=[{key:'current',label:'현재 소스 + 대체 u 파일',count:'0개 생성 / 9개 계획 실행',description:'엄격한 로드에서 u 가중치 키 8개 누락. 생성 전 공통 사전조건 실패.',commit:data.source_commits.current},
 {key:'harness',label:'과거 소스 + 최신 콜백 혼용',count:'0개 생성 / 9개 계획 실행',description:'본 연구 실행 도구의 콜백 API 통합 오류. 원 논문의 실패 근거에서 제외.',commit:data.source_commits.initial},
 {key:'historical',label:'과거 소스 + 당시 노트북',count:'9개 생성 / 9개 계획 실행',description:'변경 조건을 명시한 실행. 학습 소스 동일성과 논문 결과 재현은 미확인.',commit:data.source_commits.initial}];
 function showVariants(key){el('variants').replaceChildren(...variants.filter(v=>key==='all'||key===v.key).map(v=>{
  const tr=document.createElement('tr');const label=document.createElement('td');label.append(document.createTextNode(v.label),document.createElement('br'));const link=document.createElement('a');link.href='https://github.com/AI4Science-WestlakeU/M2PDE/tree/'+v.commit;link.textContent='소스 '+v.commit.slice(0,7)+' ↗';link.target='_blank';link.rel='noopener';label.append(link);
  const count=document.createElement('td');count.textContent=v.count;const desc=document.createElement('td');desc.textContent=v.description;tr.append(label,count,desc);return tr;
 }));}
 function showMetrics(key){el('metrics').replaceChildren(...a.rows.filter(r=>key==='all'||String(r.case)===key).map(r=>{
  const tr=document.createElement('tr');for(const value of [101+r.case,r.sampler_seed,pct(r.fields.u.reference_denominator_relativeL2),pct(r.fields.v.reference_denominator_relativeL2),r.generation_seconds.toFixed(3)+'초']){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}return tr;
 }));}
 el('mean-errors').textContent='주 출력 9개의 기술통계 평균: u '+pct(a.relativeL2.u.descriptive_mean)+', v '+pct(a.relativeL2.v.descriptive_mean)+'.';
 el('provenance').textContent='관측일 '+data.as_of+' · 그래프 '+data.graph_version+' · 계획 '+data.plan_version+' · 원고 '+data.manuscript_revision+' · 독립 과학 검증·산업 적격 통과 없음';
 el('variant-controls').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;for(const x of el('variant-controls').querySelectorAll('button'))x.setAttribute('aria-pressed',String(x===b));showVariants(b.dataset.variant);});
 el('case-filter').addEventListener('change',event=>showMetrics(event.target.value));showVariants('all');showMetrics('all');
}).catch(()=>{el('outputs').textContent='불러오기 실패';el('mean-errors').textContent='관측 데이터를 불러오지 못했습니다. HTTP로 제공된 서비스에서 다시 확인하세요.';});
