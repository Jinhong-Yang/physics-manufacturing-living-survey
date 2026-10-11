'use strict';
const BoundaryReading=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const codes=c=>[...(c?.physics_coupling_codes||[]),...(c?.physical_evidence_codes||[]),...(c?.manufacturing_codes||[])].join(' / ');
 const block=(title,body)=>`<section class="evidence-block"><h3>${esc(title)}</h3>${body}</section>`;
 const list=xs=>`<ul>${xs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 const safeUrl=u=>/^https:\/\//.test(u||'')?esc(u):'#';
 function render(p){
  const old=p.prior_targeted_audit;
  const historical=old?.cvm||old?.historical_cvm||old?.codes||{};
  const claims=p.claims.map(c=>`<div class="claim-item"><b>PDF ${esc(c.pdf_pages_1_based.join(', '))}쪽 · ${esc(c.location)}</b><span class="meta-row">${c.evidence_kind==='author_reported'?'논문의 저자 보고':'검토자의 해석·확인 질문'}</span><p>${esc(c.paraphrase)}</p></div>`).join('');
  const releases=p.release_pins.length?p.release_pins.map(x=>`<p><b>${esc(x.repository)}</b><br>관측 시점: ${esc(x.checked_at_utc)}<br>고정 버전: <code>${esc(x.immutable_commit)}</code></p><p>확인 범위: commit 메타데이터·README·LICENSE·requirements. 전체 코드·데이터·모델 획득과 실행: 미완료</p>${list(x.snapshots.filter(y=>y.commit_pinned).map(y=>`${y.kind}: SHA256 ${y.sha256}`))}`).join(''):'<p>이번 보완에서 해당 방법의 전체 코드·모델 release를 새로 검증하지 않았습니다. 공개 구현의 부재를 뜻하지 않습니다.</p>';
  const observations=p.release_observations.map(x=>`<p class="scope-note">${esc(x.observation)}</p>`).join('');
  return `<p class="eyebrow">${esc(p.method)} · ${esc(p.venue)} ${p.year} · 추가 비교 후보 ${p.order}/4</p><h2>${esc(p.title)}</h2><p class="meta-row">취득 PDF ${p.pdf_pages}쪽 · 동일 AI 검토 · 독립 조정 대기</p><p><a href="${safeUrl(p.pdf_url)}" target="_blank" rel="noopener noreferrer">공식 논문 PDF ↗</a></p>
  ${block('원문 검토와 분류 범위',`<p>${esc(p.accepted_version_observation)}</p><p class="inline-codes">새 제안: ${esc(codes(p.provisional_cvm))}</p><p>C/V/M은 서로 다른 범주이며 준비도 점수가 아닙니다. 저자 보고 물리 근거를 본 연구의 독립 검증으로 해석하지 않습니다.</p><p>기존 감사: ${esc(codes(historical)||'아래 기존 감사와 원본 기록에서 확인')}</p><details><summary>기존 감사와 분류 조정 질문</summary><pre>${esc(JSON.stringify({prior_targeted_audit:old,coding_reconciliation:p.coding_reconciliation},null,2))}</pre></details><p>최종 포함·외부 보충자료 전체 검토·독립 판정: 미완료</p>`)}
  ${block('공개 자산의 마지막 확인과 사용 조건',releases+observations+'<p>새 실행 성공·독립 과학 R4·산업 적용 합격: 이번 통합에서 추가하지 않음</p>')}
  ${block('원문 주장의 위치와 비교 조건',claims)}
  ${block('계획된 새 작업과 검증',`<p>자산·진입점·예산·사례·validator를 확인해 결과 관측 전에 등록할 계약입니다. 이번에는 실행하지 않았습니다.</p><pre>${esc(JSON.stringify(p.planned_new_task,null,2))}</pre>`)}
  ${block('기존 감사·실행과 연결',`<ul>${p.graph_work_ids.map(id=>`<li><a href="index.html?audit=${encodeURIComponent(id)}#record-detail">기존 감사 및 실행 이력: ${esc(id)} ↗</a></li>`).join('')}</ul><p>과거 실행 성공을 이번 저장소 버전 또는 산업 프로파일에 복사하지 않습니다.</p>`)}
  <details><summary>출처 확인</summary><p class="meta-row">PDF SHA256: ${esc(p.pdf_sha256)}<br>검토 기록 SHA256: ${esc(p.review_sha256)}<br>원문 PDF·추출 전문·페이지 이미지·전체 저장소·모델은 이 서비스에서 재배포하지 않습니다.</p></details>`;
 }
 return {esc,codes,render};
})();
if(typeof module!=='undefined')module.exports=BoundaryReading;
if(typeof document!=='undefined'){
 let data,selected;const el=id=>document.getElementById(id),params=new URLSearchParams(location.search);
 function drawList(){const q=el('reading-search').value.toLowerCase(),hits=data.records.filter(p=>[p.method,p.title,p.venue,BoundaryReading.codes(p.provisional_cvm)].join(' ').toLowerCase().includes(q));
  el('reading-list').innerHTML=hits.length?hits.map(p=>`<button class="reading-card" role="option" aria-selected="${p.work_id===selected}" data-work="${BoundaryReading.esc(p.work_id)}"><b>${BoundaryReading.esc(p.method)}</b><small>${p.pdf_pages}쪽 · ${BoundaryReading.esc(BoundaryReading.codes(p.provisional_cvm))}</small></button>`).join(''):'<p>조건에 맞는 논문이 없습니다.</p>';
  el('reading-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>select(b.dataset.work)));
 }
 function select(id){const p=data.records.find(x=>x.work_id===id);if(!p)return;selected=id;el('reading-detail').innerHTML=BoundaryReading.render(p);history.replaceState(null,'',`?work=${encodeURIComponent(id)}`);drawList();}
 fetch('data/boundary_reading_integrated.json').then(r=>{if(!r.ok)throw new Error('검토 근거 접근 실패');return r.json();}).then(d=>{data=d;const s=d.status;el('reading-status').innerHTML=`<span>추가 ${s.boundary_comparators}편 ${s.acquired_PDF_pages}쪽</span><span>누적 ${s.cumulative_distinct_same_AI_readings}편 ${s.cumulative_acquired_PDF_pages}쪽</span><span>독립 검토 ${s.independent_reviews}편</span><span>이번 새 실행·합격 ${s.new_execution_records}건</span>`;el('reading-search').addEventListener('input',drawList);select(d.records.some(x=>x.work_id===params.get('work'))?params.get('work'):d.records[0].work_id);}).catch(e=>{el('reading-detail').textContent=e.message;});
}
