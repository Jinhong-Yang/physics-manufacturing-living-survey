'use strict';
const gfEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gfEl=id=>document.getElementById(id);let gfData,gfScope='full';
function gfRender(){
 const rows=gfData.results.filter(r=>gfScope==='full'?r.records===3679:r.records===12);const pair=gfData.comparisons.find(c=>c.records===rows[0].records);
 gfEl('scope-full').setAttribute('aria-pressed',String(gfScope==='full'));gfEl('scope-bounded').setAttribute('aria-pressed',String(gfScope==='bounded'));
 gfEl('execution-denominator').textContent=gfScope==='full'?'공개 CSV의 물리 레코드 3,680개 중 원본 로더는 첫 레코드를 헤더로 처리하여 3,679개를 읽었습니다. 논문의 테스트 분모 3,681개와 구분합니다.':'모델 결과를 보기 전에 선정한 물리 레코드 13개 중 원본 로더가 읽은 12개를 확인했습니다. 전체 입력 결과와 별도로 표시합니다.';
 const rate=(pass,n)=>`${pass.toLocaleString('ko-KR')}/${n.toLocaleString('ko-KR')} · ${(100*pass/n).toFixed(2)}%`;
 gfEl('execution-results').innerHTML=rows.map(r=>`<tr><td>${r.variant.includes('dataset_language')?'저자 데이터용 언어':'원본 기본 언어'}</td><td>${r.records.toLocaleString('ko-KR')}개 완료</td><td>${rate(r.source_reported_grammar_pass,r.records)}</td><td>${rate(r.source_reported_AABB_proxy_pass,r.records)}</td></tr>`).join('');
 gfEl('execution-comparison').textContent=`숫자 토큰은 ${pair.identical_numeric_records.toLocaleString('ko-KR')}개 입력 모두 같았으며, 부품 이름으로 해석한 시퀀스는 ${pair.decoded_sequence_differences.toLocaleString('ko-KR')}개 모두 달랐습니다. 재학습한 모델의 성능 향상으로 해석하지 않습니다.`;
}
fetch('data/gearformer_execution_integrated.json').then(r=>{if(!r.ok)throw Error('evidence unavailable');return r.json();}).then(d=>{
 gfData=d;gfEl('execution-status').textContent='2026년 10월 12일 관측 · 공개 모델의 실제 생성과 설정별 결과를 확인했습니다.';
 gfEl('execution-overview').innerHTML='<article>가중치 확보·엄격한 로드<strong>2개 파일</strong><small>원본 바이트와 해시 확인</small></article><article>전체 입력의 생성·저장<strong>설정별 3,679개</strong><small>원본 로더의 분모</small></article><article>산업 사용 자격<strong>미확립</strong><small>독립 검증·사용 조건 필요</small></article>';
 gfEl('execution-rights').textContent=d.rights_ko;
 gfEl('execution-runs').innerHTML=d.runs.map(r=>`<li><b>${r.status==='passed'?'생성·저장 검증 완료':'연구용 검사 중단'}</b> · ${r.variant.includes('dataset_language')?'데이터용 언어':'기본 언어'} · ${r.variant.includes('full')?'전체 입력':'제한된 입력'}<br><small>${r.status==='passed'?r.generated_sample_count.toLocaleString('ko-KR')+'개 출력 확인':r.sample_generation_executed?'생성 토큰 관측 후 파일 검사에서 중단 · 원본 모델 실패로 합산하지 않음':'모델 반환 후 연구용 자료형 검사에서 중단 · 반환값 형식은 당시 저장되지 않음'}</small><details><summary>조건과 관측 식별자</summary><p>${gfEsc(r.scope)}</p><p>${gfEsc(r.variant)} · 기록 SHA256 ${gfEsc(r.trial_result_sha256)}</p></details></li>`).join('');
 gfEl('execution-version').textContent=`고정 커밋 ${d.source_commit}. 원본 소스는 유지했으며 Windows 의존성·제한된 로드·연구용 검사는 명시적으로 적용했습니다. 전체 저자 학습 환경을 복제한 결과는 아닙니다.`;
 gfEl('execution-sources').innerHTML=d.source_urls.map(url=>`<li><a href="${gfEsc(url)}" target="_blank" rel="noopener">공식 공개 자산·소스 ↗</a></li>`).join('');
 gfEl('scope-full').addEventListener('click',()=>{gfScope='full';gfRender();});gfEl('scope-bounded').addEventListener('click',()=>{gfScope='bounded';gfRender();});gfRender();
}).catch(()=>{gfEl('execution-status').textContent='실행 근거 파일을 불러오지 못했습니다. 연구 목록에서 다시 열어주세요.';});
