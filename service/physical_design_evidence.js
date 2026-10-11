(function(root){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isPhys=r=>r.work_id==='W_neurips_2025_3933b264379fb08f';
 function resolve(data,key){if(!key)return data.records[0];return data.records.find(r=>r.work_id===key||r.graph_work_id===key||r.graph_work_alias===key||r.method===key||(key==='PhysX-3D'&&isPhys(r)))||data.records[0];}
 function trialRows(data){return data.runs.map(r=>{const observer=r.variant==='instrumented_pre_render_observation';const label=observer?'별도 관찰 장치':r.timeout?'FA3 제외 · 900초 제한':'기본 attention 설정';const result=observer?'메시 1개와 배열 9개를 직접 저장':r.timeout?'렌더링 단계 표시 이후 시간 초과':'초기 샘플링의 CUDA 오류';const scope=observer?'렌더링 직전 의도적 종료 · 전체 실행 미완료':'최종 배열 직접 관측 없음';return `<tr><td>${esc(label)}</td><td>${esc(result)}</td><td>${esc(scope)}</td></tr>`;}).join('');}
 function view(data,record){
  const phys=isPhys(record);const title=phys?'PhysX-3D / PhysXGen':'TIDES';
  const summary=phys?'일반 객체의 형상과 추정·주석된 물성을 생성합니다. 제조 공정의 지배방정식이나 측정된 재료 응답을 충족한다고 판단할 근거는 별도입니다.':'텍스트 조건과 FEM 기반 구조 목적을 연결합니다. 저자의 제작·굽힘 실험은 공개 소프트웨어 실행과 다른 근거입니다.';
  const remaining=phys?'독립 물리·치수·재료 검증, 원본 전체 실행, 사용 권리의 완결, 공정·장비·허용오차 적합성 및 외부 현장 성능이 미확인입니다. 일반 객체 경계 사례이며 제조 핵심 포함 판정은 독립 심사 대기입니다.':'검토한 출처에서는 현재 실행 가능한 TIDES 저자 구현을 확립하지 못했습니다. 향후 공개 약속과 다른 연구의 저장소는 실행 가능 근거로 계산하지 않습니다. 저자 실험의 단위·불확실성과 대상 제조 용도에 대한 독립 검증도 필요합니다.';
  return {title,phys,remaining,reading:`<h2>${esc(title)}</h2><p>${esc(summary)}</p><div class="evidence-grid"><article>공식 논문 검토<strong>${record.pages}쪽</strong>전체 텍스트와 선택 그림·표 확인</article><article>출처 연결 주장<strong>${record.claims.length}개</strong>페이지와 위치를 아래에서 확인</article><article>독립 검토<strong>대기</strong>제조 적격 통과로 해석하지 않음</article></div><p class="evidence-notice">같은 AI가 수행한 검토입니다. TIDES는 기존 연구에 공식 PDF 근거를 추가했으며 새로운 연구로 중복 집계하지 않습니다.</p><a href="${esc(record.pdf_url)}" target="_blank" rel="noopener">공식 논문 ↗</a>`,claims:record.claims.map(c=>`<li><b>${esc(c.id)} · ${c.pages.map(p=>esc(p)+'쪽').join(', ')} · ${esc(c.locus)}</b><br>${esc(c.statement)}<br><small>저자 보고 또는 원문 해석 · 독립 검토 대기</small></li>`).join('')};
 }
 const api={esc,resolve,trialRows,view};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
 root.PhysicalDesignEvidence=api;
 const el=id=>document.getElementById(id);let data,selected;
 function render(){const v=view(data,selected);el('reading-overview').innerHTML=v.reading;el('source-claims').innerHTML=v.claims;el('remaining-gates').textContent=v.remaining;el('execution-panel').hidden=!v.phys;
  document.querySelectorAll('[data-method]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.method==='PhysX-3D')===v.phys)));
  if(v.phys){el('trial-rows').innerHTML=trialRows(data);const m=data.observed_mesh;el('mesh-overview').innerHTML=`<article>정점<strong>${m.vertices.toLocaleString('en-US')}</strong>한 메시의 직접 관측</article><article>삼각형 면<strong>${m.faces.toLocaleString('en-US')}</strong>출력 파일의 수치·형상 검사</article><article>유한값 확인<strong>9개 배열</strong>관측된 NaN/Inf 없음</article>`;el('geometry-scope').textContent='모서리 incidence·방향·연결 성분을 확인했습니다. 자기 교차, 전체 manifold 조건, 제조 치수, 재료 물성, 하중 응답과 제작 적격성은 검증하지 않았습니다.';
   el('asset-rights').innerHTML=`<ul>${data.asset_sources.map(a=>`<li><b>${esc(a.kind)}</b>: ${esc(a.rights)} · <a href="${esc(a.url)}" target="_blank" rel="noopener">검토한 자산 ↗</a></li>`).join('')}</ul><p>코드·모델·데이터 조건을 합쳐 상업 사용 통과로 판단하지 않습니다.</p>`;
   el('memory-scope').innerHTML=`<p>PyTorch allocated ${data.memory.allocated_bytes.toLocaleString('en-US')} bytes, reserved ${data.memory.reserved_bytes.toLocaleString('en-US')} bytes. 별도 호스트 조회 용량은 ${data.memory.reported_host_capacity_MiB.toLocaleString('en-US')} MiB였습니다.</p><p>측정값의 대응 관계는 미해결이며 물리적 resident peak와 원인을 측정하지 않았습니다. 최소 VRAM이나 산업 처리량 요구 조건을 도출하지 않습니다.</p>`;
   el('version-bindings').innerHTML=`<p>고정 코드: ${esc(data.source_commit)}</p><p>원시 배열 SHA256: ${esc(m.private_npz_sha256)}</p><p>원시 배열·미리보기·가중치는 이 사이트에서 재배포하지 않습니다. 공개 요약만으로 독립 재계산이 가능하다고 주장하지 않습니다.</p>`;
  }
 }
 fetch('data/physical_design_evidence_integrated.json').then(r=>{if(!r.ok)throw Error('unavailable');return r.json();}).then(d=>{data=d;selected=resolve(d,new URLSearchParams(location.search).get('work'));el('source-status').textContent=`공식 논문 2편 · 47쪽 · 31개 주장 · 그래프 ${d.graph_version}. 독립 R4·산업 적격 통과 0건.`;document.querySelectorAll('[data-method]').forEach(b=>b.addEventListener('click',()=>{selected=resolve(data,b.dataset.method);history.replaceState(null,'','?work='+encodeURIComponent(isPhys(selected)?'PhysX-3D':'TIDES'));render();}));render();}).catch(()=>{el('source-status').textContent='근거 파일을 불러오지 못했습니다. 통과 상태를 추정하지 않습니다.';});
})(typeof window!=='undefined'?window:globalThis);
