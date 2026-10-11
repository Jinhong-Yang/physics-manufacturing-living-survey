'use strict';
const escSupp=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let supplementData,selectedSupplement;
const suppEl=id=>document.getElementById(id);
function renderSupplementDetail(){
 const r=supplementData.records.find(x=>x.work_id===selectedSupplement);if(!r)return;
 const renderedLimit=r.unresolved_rendered_text_regions.length?'<p class="supp-limit">25쪽 본문·그림 설명의 일부가 가려져 있습니다. 완전한 판독이나 복원된 글자를 근거로 삼지 않습니다.</p>':'';
 suppEl('supp-detail').innerHTML=`<p class="eyebrow">${escSupp(r.venue)} · 보충자료 근거</p><h2>${escSupp(r.method)}</h2><p>${escSupp(r.summary_ko)}</p><div class="supp-meta"><span>보충자료 ${r.pages}쪽</span><span>원본 그림 확인 ${r.visually_inspected_pages.length}쪽</span><span>독립 검토 대기</span><span>새 실행 0건</span></div><p>${r.whole_supplement_text_read?'모든 쪽의 추출 텍스트를 검토하고 선택한 원본 그림을 확인했습니다. 모든 그림을 직접 확인한 것은 아닙니다.':'모든 쪽을 원본 렌더링으로 검토했습니다. 추출 텍스트는 없으며 일부 판독 한계가 남아 있습니다.'}</p>${renderedLimit}<p><a href="${escSupp(r.url)}" target="_blank" rel="noopener">공식 보충자료 ↗</a></p><h3>제조 사용 판단에 영향을 주는 근거</h3><ul>${r.claims.map(c=>`<li><b>${escSupp(c.location)} · ${c.pages.map(p=>p+'쪽').join(', ')}</b><br>${escSupp(c.observation)}<br><small>저자 보고 또는 그 범위에 대한 분석 · 신규 실험 아님</small></li>`).join('')}</ul><h3>이어질 검증</h3><p>${escSupp(r.next_validation_ko)}</p><details><summary>원문 버전과 검토 기록</summary><p>PDF SHA256: ${escSupp(r.sha256)}</p><p>검토일: ${escSupp(supplementData.as_of)} · ${r.whole_supplement_text_read?'전체 추출 텍스트':'전체 원본 렌더링'} · 같은 AI의 비맹검 검토</p><p>원본 자산과 이전 문헌 분류를 보존했습니다. 이 검토는 최종 포함 판정이나 산업 승인으로 표시되지 않습니다.</p></details>`;
}
function renderSupplementList(){
 const q=suppEl('supp-search').value.toLowerCase();const hits=supplementData.records.filter(r=>[r.method,r.summary_ko,...r.claims.map(c=>c.observation)].join(' ').toLowerCase().includes(q));
 suppEl('supp-count').textContent=`검색 결과 ${hits.length}개`;
 suppEl('supp-list').innerHTML=hits.length?hits.map(r=>`<button type="button" aria-pressed="${selectedSupplement===r.work_id}" data-work="${escSupp(r.work_id)}"><b>${escSupp(r.method)}</b><small>${escSupp(r.venue)} · ${r.pages}쪽</small></button>`).join(''):'<p>검색 조건에 맞는 자료가 없습니다.</p>';
 suppEl('supp-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{selectedSupplement=b.dataset.work;history.replaceState(null,'','?work='+encodeURIComponent(selectedSupplement));renderSupplementList();renderSupplementDetail();}));
}
fetch('data/separate_supplements_integrated.json').then(r=>{if(!r.ok)throw new Error('Data unavailable');return r.json();}).then(d=>{
 supplementData=d;const requested=new URLSearchParams(location.search).get('work');selectedSupplement=d.records.find(r=>r.work_id===requested||r.graph_work_aliases.includes(requested))?.work_id||d.records[0].work_id;
 suppEl('supp-scope').textContent=`별도 PDF ${d.scope.reviewed_PDFs}개 · ${d.scope.reviewed_physical_pages}쪽 검토. ${d.scope.fully_read_PDFs}개 ${d.scope.fully_read_pages}쪽은 전체 추출 텍스트를 읽었고, SeaS 26쪽은 원본 렌더링으로 확인했습니다. 새 고유 연구·실행·산업 통과를 추가하지 않았습니다.`;
 suppEl('supp-search').addEventListener('input',renderSupplementList);renderSupplementList();renderSupplementDetail();
}).catch(()=>{suppEl('supp-detail').innerHTML='<p class="supp-error">자료를 불러오지 못했습니다. 연구 목록에서 다시 열어주세요.</p>';suppEl('supp-scope').textContent='보충자료 파일을 확인할 수 없습니다.';});
