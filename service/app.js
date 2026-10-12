const state={graph:null,selected:null,filters:{q:'',stratum:'',artifact:'',physics:''}};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strata={hard_constraint_PDE_boundary:'수치 제약 PDE 방법론 비교',partial_2026_physics_generator_boundary:'2026 물리 생성 비교',generic_physical_asset_boundary:"일반 물성·객체 생성 경계",physically_constrained_fabrication_comparator:'물리 제약 제조 설계 비교',supplemental_tactile_contact_execution:"촉각 접촉 예제 실행",visual:'시각 합성',physics:'물리·물리장 생성',boundary:'리뷰·플랫폼 비교',priority_fulltext_targeted_audit:'우선후보 전문표적감사',discovery:'제조 전이 비교군',direct_manufacturing_transfer:'제조 직접 전이·산업 실증 비교',manufacturing_dataset:'제조 데이터셋 비교군',manufacturing_generator:'제조 CAD 생성 비교군',manufacturing_simulation:'제조 공정 시뮬레이터',engineering_sim2real_comparator:'상위 학회 공학·sim-to-real 비교',prior_art:'선행 서베이 감사',prior_art_industrial_system:'산업 생성 시스템',prior_art_industrial_model_platform:'산업 기반모델'};
const parseVenue=venue=>venue||'비교 자료';
fetch('data/taccel_peg_evidence.json').then(r=>{if(!r.ok)throw new Error('Unavailable');return r.json();}).then(e=>{
 const p=document.getElementById('peg-summary');if(p)p.textContent=`고정 200-step 예제의 두 시도에서 ${e.usable_geometry_frames}개 형상 프레임을 확인했습니다. 전체 예제는 ${e.complete_example_and_output_sanity_pass?'통과':'미완료'}입니다. 형상 궤적은 촉각 데이터나 독립 제조 표본이 아니며, 물리·산업 적격성은 미검증입니다.`;
}).catch(()=>{const p=document.getElementById('peg-summary');if(p)p.textContent='후속 실행 근거 파일을 확인하세요.';});
function displayName(node){return node?.label||node?.id||'미지정';}
function records(){return state.graph.nodes.filter(n=>n.type==='Work');}
function filterRecords(){
 const q=state.filters.q.toLocaleLowerCase('ko');
 return records().filter(n=>{
  const p=n.properties;
  const hay=[n.label,p.venue,p.summary,p.assessed_scope,p.repository_url,p.cvm?.physics_assessment,(p.cvm?.physics_coupling_codes||[]).join(' ')].join(' ').toLocaleLowerCase('ko');
  if(q&&!hay.includes(q))return false;
  if(state.filters.stratum==='industrial_systems'&&!['prior_art_industrial_system','prior_art_industrial_model_platform'].includes(p.stratum))return false;
  if(state.filters.stratum&&state.filters.stratum!=='industrial_systems'&&p.stratum!==state.filters.stratum)return false;
  if(state.filters.artifact==='yes'&&!p.artifact_link_found)return false;
  if(state.filters.artifact==='no'&&p.artifact_link_found)return false;
  if(state.filters.physics&&!p.cvm?.physics_coupling_codes?.includes(state.filters.physics))return false;
  return true;
 });
}
function selectedWork(){return records().find(n=>n.id===state.selected)||records()[0];}
function setSelected(id){state.selected=id;renderList();renderDetail();renderGraph();}
function renderList(){
 const hits=filterRecords();$('result-count').textContent=hits.length;
 $('record-list').innerHTML=hits.length?hits.map(n=>{
  const p=n.properties,active=n.id===state.selected;
  return `<button class="record-card ${active?'active':''}" role="option" aria-selected="${active}" data-id="${esc(n.id)}"><span class="record-card-title">${esc(n.label)}</span><span class="record-card-meta"><span class="pill ${esc(p.stratum)}">${esc(strata[p.stratum]||p.stratum)}</span><span>${esc(parseVenue(p.venue))}</span>${p.artifact_link_found?'<span>· 공개 링크</span>':''}</span></button>`;
 }).join(''):'<div class="empty">조건에 맞는 기록이 없습니다.<br>필터를 바꿔 다시 찾아보세요.</div>';
 document.querySelectorAll('.record-card').forEach(b=>b.addEventListener('click',()=>setSelected(b.dataset.id)));
}
function edgeTarget(id,type){return state.graph.edges.filter(e=>e.source===id&&(!type||e.type===type)).map(e=>state.graph.nodes.find(n=>n.id===e.target)).filter(Boolean);}
function claims(work){return edgeTarget(work.id,'ASSERTS').filter(n=>n.type==='Claim');}
function evidenceForClaim(claim){return edgeTarget(claim.id,'SUPPORTED_BY').filter(n=>n.type==='EvidenceSpan');}
function renderDetail(){
 const n=selectedWork();if(!n)return;
 const p=n.properties,c=p.cvm||{},claimNodes=claims(n);
 const codingOverlay=state.graph.assessment_overlays?.[n.id];
 const claim=(k)=>claimNodes.find(x=>x.id.endsWith(':'+k))?.properties.text||'';
 const allEvidence=claimNodes.flatMap(x=>evidenceForClaim(x).map(ev=>({...ev.properties,claim:x.label}))).concat(edgeTarget(n.id,"SUPPORTED_BY").filter(ev=>ev.type==="EvidenceSpan").map(ev=>({...ev.properties,claim:ev.label})));
 const paper=p.paper_url?`<a href="${esc(p.paper_url)}" target="_blank" rel="noopener">논문 원문 ↗</a>`:'';
 const artifact=p.repository_url?`<a href="${esc(p.repository_url)}" target="_blank" rel="noopener">공개 저장소 ↗</a>`:'';
 const codingCards=c.physics_coupling_codes?`<div class="coding-grid">
  <div class="coding-card"><b>물리 결합</b><strong>${esc((c.physics_coupling_codes||[]).join(' · ')||'미평가')}</strong><p>${esc(c.physics_assessment||'해당 층은 C/V/M 코딩 범위가 아닙니다.')}</p></div>
  <div class="coding-card"><b>물리 근거</b><strong>${esc(codingOverlay?.display_physical_evidence_label||(c.physical_evidence_codes||[]).join(' · ')||'미평가')}</strong><p>${esc(codingOverlay?.assessment||c.physical_evidence_assessment||'미평가')}</p></div>
  <div class="coding-card"><b>제조 근거</b><strong>${esc((c.manufacturing_codes||[]).join(' · ')||'미평가')}</strong><p>${esc(c.manufacturing_assessment||'미평가')}</p></div>
 </div>`:`<div class="coding-card"><b>비교 범위</b><p>${esc(p.assessed_scope||'')}</p><p>이 자료는 방법 후보의 C/V/M 점수 대상이 아닙니다.</p></div>`;
 const evidence=allEvidence.length?allEvidence.map(e=>`<li><b>${esc(e.claim)}:</b> ${esc(e.location||'')} — ${esc(e.observation||'')}${e.source_url?` <a href="${esc(e.source_url)}" target="_blank" rel="noopener">출처 ↗</a>`:''}${e.local_display_path?` <a href="${esc(e.local_display_path)}">관측 근거 보기 ↗</a>`:''}</li>`).join(''):'<li>구체적인 원문 위치 코딩이 없습니다.</li>';
 const unresolved=(p.unresolved||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>현재 표적 코딩에서 별도 미해결 항목을 등록하지 않았습니다.</li>';
 // Discovery D35 and audit PT14 describe the same M2PDE paper. Display its
 // follow-up evidence in both views while preserving their historical nodes.
 const followupWorkId=state.graph.followup_work_overlays?.[n.id]?.followup_work_id||(n.id==='work:D35'?'work:PT14':n.id);
 const fullReviews=edgeTarget(followupWorkId,'HAS_FULLTEXT_REVIEW');
 const readingLinks=(fullReviews.length?'<p class="detail-summary">이 화면의 분류·자산 설명은 기존 표적 감사 당시의 기록입니다. 이후 원문 검토와 새 관측은 아래 근거에서 함께 확인하세요.</p>':'')+fullReviews.map(r=>`<p class="detail-summary"><a href="${r.properties.public_review_path||'main_candidate_readings.html'}?work=${encodeURIComponent(r.properties.public_review_path==='hard_constraint_evidence.html'?r.properties.method:r.properties.work_id)}">${esc(r.properties.method)} ${r.properties.all_text_read===false?'원문 '+r.properties.pdf_pages+'쪽 중 표적 검토':'원문 '+r.properties.pdf_pages+'쪽 검토'}·분류 차이·미확인 조건 ↗</a> · 같은 AI 검토, 독립 심사 대기</p>`).join('');
 const executionFollowups=edgeTarget(followupWorkId,'HAS_EXECUTION_FOLLOWUP').map(r=>`<p class="detail-summary"><a href="${esc(r.properties.public_display_path)}">버전별 실행·수정 조건·수치 비교 보기 ↗</a> · 산업 적격 미확인</p>`).join('');
 const supplementWorkIds=state.graph.nodes.filter(x=>x.type==='Work'&&(x.id===followupWorkId||(p.systematic_candidate_work_id&&x.properties.systematic_candidate_work_id===p.systematic_candidate_work_id))).map(x=>x.id);
 const supplementaryReviews=[...new Map(supplementWorkIds.flatMap(id=>edgeTarget(id,'HAS_SUPPLEMENT_REVIEW')).map(r=>[r.id,r])).values()];
 const supplementLinks=supplementaryReviews.map(r=>`<p class="detail-summary"><a href="supplement_readings.html?work=${encodeURIComponent(r.properties.work_id)}">${esc(r.properties.method)} 보충자료 ${r.properties.supplement_pages}쪽 · 제조 조건과 미해결 근거 ↗</a> · 같은 AI 검토, 독립 심사 대기</p>`).join('');
 const releaseObservations=edgeTarget(followupWorkId,'HAS_RELEASE_OBSERVATION').filter(r=>r.properties.public_display_path);
 const releaseLinks=releaseObservations.map(r=>`<p class="detail-summary"><b>본문·정적 검토 시점의 공개 자산:</b> ${esc(r.properties.summary_ko)} <a href="${esc(r.properties.public_display_path)}">고정 버전·입력 규약·미해결 근거 ↗</a> · 새 실행·산업 통과 아님</p>`).join('');
 const fullSourceFollowup=state.graph.fulltext_review_overlays?.[followupWorkId];
 const fullSourceLink=fullSourceFollowup?`<p class="detail-summary"><a href="${esc(fullSourceFollowup.public_review_path)}">${esc(fullSourceFollowup.label)} ↗</a> · 같은 AI 후속 검토, 독립 판정 대기</p>`:'';
 const observedExecution=ExecutionEvidence.describe(n,state.graph);
 const runNodes=observedExecution.runs;
 const runHistory=runNodes.length?`<p class=\"section-label\">실행 이력</p><ul class=\"evidence-list\">${runNodes.map(run=>{const q=run.properties;const failures=state.graph.nodes.filter(f=>f.type==='FailureEvent'&&f.properties.run_id===run.id);return `<li><b>${esc(q.failure_attribution==='investigator_harness'?'연구용 검사 중단':q.status==='passed'?'기술 실행 완료':q.status==='partial'?'부분 완료':'실패')} · ${esc(q.observed_at||'')}</b><br>${esc(q.scope||'')} ${failures.map(f=>`<br>${esc(f.properties.category)}: ${esc(f.properties.message||f.properties.detail||'')}`).join('')}<br><a href=\"${esc(q.public_log||'../'+(q.log||''))}\">실행 관측 요약(JSON) ↗</a></li>`}).join('')}</ul>`:'';
 const isComparator=p.stratum?.startsWith('prior_art');
 const reviewLabel=isComparator?'공개자료 표적 감사 · 독립 검토 대기':'표적 코딩 · 독립 검토 대기';
 const executionLabel=observedExecution.label;
 const executionContext=observedExecution.context;
 $('record-detail').innerHTML=`<div class="detail-top"><div><p class="eyebrow">${esc(strata[p.stratum]||'RESEARCH RECORD')} · ${esc(p.pilot_id)}</p><h2 class="detail-title">${esc(n.label)}</h2><div class="detail-meta"><span>${esc(parseVenue(p.venue))}</span><span>·</span><span>대상 층: ${esc(strata[p.stratum]||p.stratum)}</span><span>·</span><span>${esc(reviewLabel)}</span></div></div><span class="status-chip">${esc(executionLabel)}</span></div>
 <div class="detail-links">${paper}${artifact}</div>
 <p class="section-label">연구 범위와 결과</p><p class="detail-summary">${esc(p.summary||claim('novelty_or_benchmark_scope')||'')}</p>
 <p class="section-label">물리·제조 평가</p>${codingCards}
 <p class="section-label">${executionFollowups?'기존 감사의 공개 자료 설명':'공개 실행 자료'}</p>${executionFollowups?'<p class="detail-summary">아래 자산 설명과 검증 과제는 당시의 기록입니다. 이후 생성·저장 관측은 실행 이력과 버전별 결과에서 확인하세요.</p>':''}<p class="detail-summary">${esc(claim('artifact_readiness')||p.artifact_web_audit_scope||'코드/모델 공개 상태는 이 비교 자료에서 방법별로 판정하지 않았습니다.')}</p><p class="detail-summary"><b>해석:</b> ${esc(executionContext)}</p>
 ${runHistory}
 ${fullSourceLink}${readingLinks}${executionFollowups}${supplementLinks}${releaseLinks}
 <p class="section-label">근거 구간</p><ul class="evidence-list">${evidence}</ul>
 <p class="section-label">${executionFollowups?'기존 감사 당시의 검증 과제':'미해결 항목'}</p><ul class="unresolved-list">${unresolved}</ul>
 <p class="section-label">코딩 범위</p><p class="detail-summary">${esc(p.assessed_scope||'')}<br><span class="muted">${esc(p.coding_status||'')}</span></p>`;
}
function svgNode(x,y,w,label,type,sub=''){
 const short=label.length>25?label.slice(0,24)+'…':label;
 return `<g class="graph-node ${type}" transform="translate(${x},${y})"><rect width="${w}" height="54"></rect><text class="node-type" x="11" y="17">${esc(type.toUpperCase())}</text><text class="node-label" x="11" y="34">${esc(short)}</text><text class="node-type" x="11" y="47">${esc(sub)}</text></g>`;
}
function renderGraph(){
 const n=selectedWork();if(!n)return;
 const p=n.properties,method=state.graph.nodes.find(x=>x.id===`method:${p.pilot_id}`),artifact=state.graph.nodes.find(x=>x.id===`artifact:${p.pilot_id}`)||edgeTarget(n.id,'HAS_ASSET')[0],claimNode=state.graph.nodes.find(x=>x.id===`claim:${p.pilot_id}:method_role`),evidence=(claimNode&&evidenceForClaim(claimNode)[0])||edgeTarget(n.id,"SUPPORTED_BY").find(x=>x.properties.qualification_layer==="local_element_diagnostics");
 const artifactLabel=artifact?'공개 저장소 링크':'링크 미확인';
 $('graph-view').innerHTML=`<svg viewBox="0 0 900 190" role="img" aria-label="${esc(n.label)} 연구와 방법, 공개 자료, 근거의 연결">
   <path class="graph-link" d="M205 92 L255 92 M445 92 L495 92 M685 92 L735 92"></path>
   ${svgNode(20,65,185,n.label,'work',p.venue||strata[p.stratum])}
   ${svgNode(255,65,190,method?.label||'방법 기록','method',p.stratum)}
   ${svgNode(495,65,190,artifactLabel,'artifact',ExecutionEvidence.describe(n,state.graph).outputObserved?'신규 출력 관측':artifact?'신규 출력 미확인':'공개 링크 없음')}
   ${svgNode(735,65,150,evidence?.label||'근거 범위','evidence',evidence?.properties.qualification_layer?'부분 요소 검사':'원문/저장소 보고')}
  </svg>`;
}
function render(){
 const g=state.graph,s=g.summary;
 $('snapshot-label').textContent=`Snapshot ${g.as_of} · ${g.graph_version}`;
 $('metric-records').textContent=s.graph_records||s.records;
 $('metric-sensitivity').textContent=s.title_sensitivity_work_candidates||0;
 $('metric-artifacts').textContent=s.code_or_model_link_found;
 $('metric-runs').textContent=s.methods_executed;
 $('metric-industrial').textContent=s.industrial_readiness_passes;
 $('footer-status').textContent=`${g.status.replaceAll('_',' ')} · snapshot only`;
 const requestedWork=new URLSearchParams(location.search).get('audit');
 state.selected=records().some(n=>n.id===requestedWork)?requestedWork:records()[0]?.id;
 renderList();renderDetail();renderGraph();
}
['search','stratum','artifact','physics'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',e=>{state.filters[id==='search'?'q':id]=e.target.value;renderList();if(!filterRecords().some(n=>n.id===state.selected)){state.selected=filterRecords()[0]?.id;renderDetail();renderGraph();}}));
$('clear-filters').addEventListener('click',()=>{state.filters={q:'',stratum:'',artifact:'',physics:''};$('search').value='';$('stratum').value='';$('artifact').value='';$('physics').value='';renderList();setSelected(records()[0]?.id)});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
const loadGraph=window.KNOWLEDGE_GRAPH?Promise.resolve(window.KNOWLEDGE_GRAPH):fetch('data/knowledge_graph.json').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();});
loadGraph.then(data=>{state.graph=data;render();}).catch(err=>{$('record-detail').innerHTML=`<div class="loading">지식그래프 데이터를 불러오지 못했습니다. <br><small>${esc(err.message)} · 프로젝트 서버 또는 GitHub Pages로 접속해 주세요.</small></div>`;});
fetch('data/public_artifact_revision_watch.json').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(w=>{
 const target=$('revision-watch-status');if(!target)return;
 if(w.watch_status==='not_started'){
  target.textContent='GitHub 저장소 revision 감시는 아직 활성화되지 않았습니다. 배포 후 매주 공개 repository metadata만 점검합니다.';
 }else{
  target.textContent=`마지막 repository metadata 확인: ${w.as_of} · ${w.available_n}개 확인 · ${w.revision_changes_n}개 revision 변경 · 과학적/산업적 pass 판정은 별도 검토`;
 }
}).catch(()=>{const target=$('revision-watch-status');if(target)target.textContent='Repository revision watch snapshot을 아직 불러올 수 없습니다.';});
fetch('data/discovery_queue_2026_partial.json').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(q=>{
 const target=$('discovery-status');if(!target)return;
 const venues=q.source_frame.map(x=>x.venue).join(', ');
 const tiers=q.review_priority_counts||{};
 target.textContent=`${q.source_cutoff_date} 기준 ${venues}의 catalog ${q.source_frame_record_count.toLocaleString()}편에서 제목 후보 ${q.title_candidate_count.toLocaleString()}편(집중 후보 ${(tiers.focused_title_candidate||0).toLocaleString()}, 민감도 전용 ${(tiers.sensitivity_only||0).toLocaleString()})을 추렸습니다. 이 대기열의 상태는 당시 제목 수집 기록이며 최종 선별이 아닙니다. 2026 부분 연도 후보는 본 분석의 완료 연도 포함 분모가 아닙니다. 개별 후속 감사의 원문·실행 상태는 해당 연구 기록에서 확인하세요.`;
}).catch(()=>{const target=$('discovery-status');if(target)target.textContent='신규 후보 대기열 스냅샷을 불러올 수 없습니다.';});
fetch('data/supplemental_abstract_evidence.json').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(q=>{
 const target=$('sensitivity-recovery-status');if(!target)return;
 const newReview=q.new_AI_screen_pending===0?'새 후보의 AI 초록 첫 검토를 마쳤습니다.':`새 후보 ${q.new_AI_screen_pending}편의 AI 초록 검토가 남았습니다.`;
 const historical=q.historical_AI_original_text_recheck_pending?` 기존 ${q.historical_AI_original_text_recheck_pending}편의 판정은 확보한 원문 초록으로 다시 확인해야 합니다.`:q.historical_AI_original_text_rechecks_completed?` 기존 ${q.historical_AI_original_text_rechecks_completed}편도 원문 초록으로 같은 AI가 재검토했습니다. 보충 전체 ${q.current_complete_original_AI_screened}편의 현재 AI 판정을 기록했습니다.`:'';
 target.textContent=`고정 보충 후보 ${q.candidate_works}편 모두에서 공식 초록을 확보했습니다. 새 후보 ${q.new_AI_screen_completed||0}편의 AI 초록 검토를 기록했습니다. ${newReview}${historical} 전체 ${q.candidate_works}편의 독립 검토는 대기 중입니다. AI 판정은 최종 선별이 아닙니다. 초록 확보는 최종 연구 포함, 공개 모델 실행 또는 산업 사용 자격이 아닙니다.`;
}).catch(()=>{const target=$('sensitivity-recovery-status');if(target)target.textContent='보충 초록 확보 기록을 불러올 수 없습니다.';});

fetch('data/supplemental_fulltext_evidence.json').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(q=>{
 const target=$('sensitivity-fulltext-status');if(!target)return;const c=q.counts;
 target.textContent=`보충 후속 후보 ${c.supplemental_H2_followups}편 중 사전 고정 높은 우선순위 ${c.fixed_high_priority_attempts}편을 시도해 공식 원문 ${c.official_pdfs_acquired}편을 확보했습니다. ${c.not_acquired}편은 접근 경로 해결이 남았습니다. 정적 표적 감사 ${c.targeted_static_audits}건은 완전한 원문·독립 검토가 아닙니다. 신규 실행·산업 통과는 추가하지 않았습니다. ThermalGen·IHRUT·Taccel의 모델 버전, 교정 조건, 구현·자원 제약은 연결된 감사 기록에서 확인할 수 있습니다.`;
 const list=$('sensor-audit-list');if(list){
  const labels={SUP_A03:['ThermalGen · 열영상 외관 합성','공개 코드와 모델 버전을 확인했습니다. 생성 영상의 화질과 온도 정확도는 별도이며, 실제 센서 교정과 결함 검사 평가가 필요합니다.'],SUP_A04:['IHRUT · 교정 기반 초분광 데이터 합성','교정 파일과 모델 목록을 확인했습니다. 기본 소스 연결 두 곳과 사용권을 해결한 뒤, 실제 검사 장비에서 검증해야 합니다.'],SUP_A05:['Taccel · 접촉 물리 기반 촉각 합성','기계 부품에서의 실물 평가가 논문에 보고됐습니다. 지원 환경의 실행과 센서·재료 교정, 조립 공차 검증은 별도로 필요합니다.']};
  list.replaceChildren();
  for(const audit of q.targeted_audits){if(!labels[audit.audit_id])continue;const [title,summary]=labels[audit.audit_id];
   const article=document.createElement('article'),heading=document.createElement('h3'),body=document.createElement('p'),link=document.createElement('a');
   heading.textContent=title;body.textContent=summary;link.textContent='검토한 공개 구현 열기 ↗';link.href=`${audit.artifact_repo}/tree/${audit.artifact_pin}`;link.target='_blank';link.rel='noopener noreferrer';
   article.append(heading,body,link);list.append(article);
  }
 }
}).catch(()=>{const target=$('sensitivity-fulltext-status');if(target)target.textContent='보충 원문 확보 기록을 불러올 수 없습니다.';const list=$('sensor-audit-list');if(list)list.textContent='후보별 적용 조건을 불러올 수 없습니다.';});
