'use strict';
const ReadingEvidence=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const category=c=>[...(c?.C||[]),...(c?.physical_verification||[]),...(c?.manufacturing||[])].join(' / ');
 const graphCategory=c=>[...(c?.physics_coupling_codes||[]),...(c?.physical_evidence_codes||[]),...(c?.manufacturing_codes||[])].join(' / ');
 const block=(title,body)=>`<section class="evidence-block"><h3>${esc(title)}</h3>${body}</section>`;
 const list=items=>`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 function render(p){
  const codes=category(p.provisional_codes),historical=p.graph_current_audit_codes||[];
  const basis=p.code_evidence_basis?list(Object.entries(p.code_evidence_basis).map(([k,v])=>`${k}: ${v}`)):'<p>초기 기록의 분류 근거는 원문 주장별 위치에 연결되어 있습니다. 별도 분류 이유 필드가 없는 경우 미기록 상태로 유지합니다.</p>';
  const disagreement=p.coding_disagreement_for_adjudication?`<p class="scope-note"><b>분류 차이 · 독립 심사 대기</b><br>${esc(p.coding_disagreement_for_adjudication.reason)}</p>`:'';
  const paragraphs=Object.entries(p.generation).map(([k,v])=>`<p><b>${esc({reference_data:'자료 생성·참조',forward_surrogate:'대리 모델의 입력·출력',inverse_generation:'역설계·최적화',physical_measurement_scope:'실측 범위',not_demonstrated:'이번 근거로 확인되지 않은 범위'}[k]||k)}</b><br>${esc(v)}</p>`).join('');
  const claims=p.claims.map(c=>`<div class="claim-item"><b>PDF ${esc(c.pdf_pages_1_based.join(', '))}쪽 · ${esc(c.location)}</b><span class="meta-row">${c.evidence_kind==='author_reported'?'저자 보고의 원문 근거':'검토자의 해석·확인 질문'}</span><p>${esc(c.paraphrase)}</p></div>`).join('');
  const run=p.carried_forward_local_execution;
  const context=run?`<p>${esc(run.scope||'과거 조사에서 생성 실행 관측 없음. 이번 통합에서는 새 실행을 수행하지 않았습니다.')}</p><details><summary>과거 실행의 범위·수치·미확인 상태</summary><pre>${esc(JSON.stringify(run,null,2))}</pre></details>`:'<p>이 초기 검토 기록에는 별도의 실행 요약 필드가 없습니다. 기존 지식그래프의 실제 실행 이력을 확인하세요. 이번 원문 검토·통합의 새 실행은 0건입니다.</p>';
  const release=p.release_snapshot;
  return `<p class="eyebrow">${esc(p.method)} · ${esc(p.venue)} ${p.year} · 고정 후보 ${p.order}/14</p><h2>${esc(p.title)}</h2><p class="meta-row">취득 PDF ${p.pdf_pages}쪽 · 같은 AI 검토 · 독립 심사 대기</p><p><a href="${esc(p.official_pdf_url)}" target="_blank" rel="noopener noreferrer">공식 논문 PDF ↗</a></p>${block('원문 검토 범위',`<p>${esc(p.accepted_version_observation)}</p><p>외부 보충자료 전체 검토: 미완료 · 최종 포함 판정: 대기</p>`)}
  ${block('물리·제조 근거의 제안 분류',`<p class="inline-codes">${esc(codes)}</p><p>C/V/M은 서로 다른 범주이며 준비도 점수가 아닙니다. 물리 코드는 저자 보고 근거이고 독립 재현을 뜻하지 않습니다.</p>${basis}${disagreement}<details><summary>기존 감사의 분류와 적용 범위</summary>${list(historical.map(x=>`${x.graph_id}: ${graphCategory(x.cvm)}`))}<p>기존 분류와 실행 이력을 덮어쓰지 않았습니다.</p></details>`)}
  ${block('무엇을 생성하고 검증했는가',paragraphs)}
  ${block('공개 자산과 산업 사용 조건',`<p>아래는 기록 당시 조사입니다. 이번 원문 검토에서 온라인 상태를 새로 확인하지 않았습니다.</p><p>${esc(release.carried_forward_observation||'기록된 공개 자산 근거는 기존 감사에서 확인하세요.')}</p><p>${esc(release.rights_snapshot||'사용 권한의 전체 확인은 미완료입니다.')}</p><p>실행 가능·독립 물리·산업 적용 합격: 이번 검토에서 추가하지 않음</p>`)}
  ${block('기존 실행 근거와 해석 범위',context+`<ul>${p.graph_work_ids.map(id=>`<li><a href="index.html?audit=${encodeURIComponent(id)}#record-detail">기존 감사와 실행 근거 열기: ${esc(id)} ↗</a></li>`).join('')}</ul>`)}
  ${block('원문 주장의 위치와 확인 질문',claims)}
  ${block('미확인 조건과 다음 검증',list(p.open_questions))}
  <details><summary>검토 기록의 출처 확인</summary><p class="meta-row">PDF SHA256: ${esc(p.pdf_sha256)}<br>검토 기록 SHA256: ${esc(p.review_sha256)}<br>직접 원문·추출 전문·페이지 이미지는 이 서비스에서 재배포하지 않습니다.</p></details>`;
 }
 return {esc,category,render};
})();
if(typeof module!=='undefined')module.exports=ReadingEvidence;
if(typeof document!=='undefined'){
 let cohort=null,selected=null;const el=id=>document.getElementById(id);
 const params=new URLSearchParams(location.search);
 function select(id){selected=id;const p=cohort.records.find(x=>x.work_id===id);if(!p)return;el('reading-detail').innerHTML=ReadingEvidence.render(p);history.replaceState(null,'',`?work=${encodeURIComponent(id)}`);drawList();}
 function drawList(){const q=el('reading-search').value.toLowerCase();const rows=cohort.records.filter(p=>[p.method,p.title,p.venue,p.provisional_topic_decision,ReadingEvidence.category(p.provisional_codes)].join(' ').toLowerCase().includes(q));
  el('reading-list').innerHTML=rows.length?rows.map(p=>`<button class="reading-card" role="option" aria-selected="${p.work_id===selected}" data-work="${ReadingEvidence.esc(p.work_id)}"><b>${ReadingEvidence.esc(p.method)}</b><small>${ReadingEvidence.esc(p.venue)} ${p.year} · ${p.pdf_pages}쪽 · ${ReadingEvidence.esc(ReadingEvidence.category(p.provisional_codes))}</small></button>`).join(''):'<p>조건에 맞는 후보가 없습니다.</p>';
  el('reading-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>select(b.dataset.work)));
 }
 fetch('data/main_candidate_reading_cohort.json').then(r=>{if(!r.ok)throw new Error('근거 파일 접근 실패');return r.json();}).then(c=>{cohort=c;const s=c.status;el('reading-status').innerHTML=`<span>고정 후보 ${s.fixed_candidate_works}편</span><span>취득 PDF ${s.acquired_PDF_pages}쪽</span><span>독립 심사 ${s.independent_reviews}편</span><span>이번 새 실행·합격 ${s.new_execution_records}건</span>`;el('reading-search').addEventListener('input',drawList);select(c.records.some(x=>x.work_id===params.get('work'))?params.get('work'):c.records[0].work_id);}).catch(e=>{el('reading-detail').textContent=e.message;el('reading-status').textContent='검토 자료를 불러오지 못했습니다.';});
}
