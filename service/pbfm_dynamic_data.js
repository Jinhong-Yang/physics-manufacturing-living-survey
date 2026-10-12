(function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sci=x=>Number(x).toExponential(3);
 function view(d){
  const overview=`<div class="cards"><article>원본 테스트 필드<strong>${d.original_test_fields}개</strong>${d.original_nominal_groups}개 조건군의 입력 자료</article><article>이번 새 모델 생성<strong>0건</strong>데이터 진단과 엄격 로딩을 구분</article><article>엄격 모델 로딩<strong>${d.preflight.loaded_ema_keys}개 키 일치</strong>CPU 구성 확인 · 생성은 대기</article></div><p><a href="${esc(d.data_url)}" target="_blank" rel="noopener">고정 원본 데이터 ↗</a> · ${d.data_bytes.toLocaleString()}바이트</p>`;
  const b=d.stored_condition_bounds.results.real_condition;
  const inputs=`<p>${d.original_nominal_groups}개 명목 조건군 안에 각각 32개 변형이 있습니다. 이 ${d.original_test_fields}개를 독립적인 제조 표본으로 세지 않습니다. 저장${d.stored_channels}채널 중${d.model_output_channels}개는 모델 출력이고 나머지 2개는 원본 잔차 계산의 전단 방향 부호에 사용됩니다. 외부 형상의 정확도는 별도 검증이 필요합니다.</p><p>원본 코드는 명목 조건을 입력으로 사용합니다. 저장된 4개 열과 원문 물리 변수의 순서·단위 변환은 검토한 경로에서 명시적으로 확인하지 못했습니다. 숫자 범위만으로 변환을 추정하지 않습니다.</p><p>저장 좌표의 원본 정규화 범위 밖에 실제 변형${b.vectors_outside_loader_box}개가 있었고${b.groups_with_any_outside}개 조건군에 걸쳐 있습니다. 이것은 제조 공정 창이나 산업 불합격 판정이 아닙니다.</p>`;
  const s=d.summary;
  const residuals=`<div class="table-scroll"><table><thead><tr><th>계산 대상</th><th>이상기체 정규화 MSE</th><th>전단 정규화 MSE</th></tr></thead><tbody><tr><td>원본 개별 필드의 잔차 평균</td><td>${sci(s.per_field_mean_ideal_gas_MSE)}</td><td>${sci(s.per_field_mean_signed_shear_MSE)}</td></tr><tr><td>조건군 평균 필드·평균 방향의 잔차</td><td>${sci(s.residual_of_group_mean_ideal_gas_MSE)}</td><td>${sci(s.residual_of_group_mean_signed_shear_MSE)}</td></tr></tbody></table></div><p>16개 조건군에서 두 계산 대상이 달랐습니다. 이 수치는 생성 모델의 성능이나 제조 합격률이 아닙니다. 평균·분산 평가와 개별 출력의 물리 검증을 구분합니다.</p><details><summary>수식 일치와 인공 대조의 범위</summary><p>512개 원본 필드의 값은 유한했고 압력·온도·밀도가0이하인 점은 관측하지 못했습니다. 원본 수식과 별도 NumPy 계산의 최대 scaled차는${sci(d.diagnostics.max_scaled_same_formula_discrepancy)}입니다. 동일 대수식·정규화를 공유하는 소프트웨어 점검이며 독립 교정이 아닙니다. 첫 필드의 압력에 정규화 규모를 더한 인공 대조는 잔차 증가를 검출했습니다. 실제 결함이나 모델 실패 사례가 아닙니다.</p></details>`;
  const statistics=`<p>원본 검증 데이터는 NumPy의 population 표준편차를, 예측 통계는 현재 Torch의 correction1 표준편차를 사용합니다. 규약과 표본 수를 명시해야 합니다. 표준편차를 표준오차로 해석하지 않습니다.</p><p>같은32개 원본 필드에 두 규약을 적용한 대조는 계산 차이를 보인 것입니다. 어느 규약이 틀렸다고 판정하거나 저자 보고 지표를 수정한 결과가 아닙니다.</p>`;
  const limits=`<p>원본 조건당 배치128·16조건·20단계 생성 시험은 아직 시작하지 않았습니다. 마지막 자원 관측은 ${d.resource_observation.free_MiB} MiB 여유 메모리·${d.resource_observation.utilization_percent}% 사용률이며 실시간 표시가 아닙니다. 운영상 자원 확보 조건은 논문의 최소 VRAM이나 물리 합격 기준이 아닙니다.</p><p>단위·입력 규약, 외부 물리 참조, 제조 용도, 사용 조건, 독립 검토와 저자 승인이 남아 있습니다. 이 자료는 0.9.42 시점의 입력 진단이며, 본 화면은 공개 서비스 0.9.45에 제공하는 후속 기록입니다. 공개 배포와 독립 물리·제조 검증은 별도입니다.</p>`;
  const translations={
   PD01:['저장 데이터의 8채널 가운데 6개는 모델 출력으로 정규화하고, 나머지 2개는 별도 항목으로 반환합니다.','데이터 카드의 6개 출력 필드와 추가 채널을 구분합니다. 외부 형상 교정은 확인하지 않았습니다.'],
   PD02:['학습 코드가 추가 항목을 cos_sin으로 받아 잔차 함수에 전달합니다. 평가에서는 조건군 평균값을 128회 반복해 사용합니다.','이 연결은 구현에서의 역할을 확인한 것이며, 방향 데이터의 외부 형상 정확도를 검증하지 않습니다.'],
   PD03:['잔차 함수는 방향 두 값의 내적으로 전단 부호를 정하고, 기울기 크기와 온도에 따른 점성 계산을 사용합니다.','현재 구현의 부호 있는 전단 관계를 확인했습니다. 전체 유동 방정식이나 외부 물리 교정은 별도입니다.'],
   PD04:['원본 로더는 명목 조건과 저장 좌표의 경계를 사용합니다. 두 로더 함수에서 real_condition은 읽지 않습니다.','저장 열과 원문의 물리 변수·단위 변환은 검토한 경로에서 미확인입니다. 숫자 범위로 변환을 추정하지 않습니다.'],
   PD05:['검증 데이터의 표준편차는 NumPy 기본값, 예측의 표준편차는 별도 보정 인수를 주지 않은 Torch 기본값으로 계산합니다.','현재 재사용 환경에서 두 규약을 확인했습니다. 어느 규약이 틀렸다고 판정하거나 저자 보고 지표를 수정하지 않았습니다.'],
   PD06:['모델 함수는 네 열의 조건 벡터를 특징 공간에 반복해 시간 표현과 합칩니다.','이 선택 소스 검토는 실제 모델 실행이 아닙니다. 설명 문자열은 물리 열의 단위를 정의하지 않습니다.']
  };
  const claims=d.source_claims.map(c=>{const t=translations[c.claim_id]||[c.statement,c.caveat];return `<li><b>${esc(c.claim_id)}</b><br>${esc(t[0])}<br><em>${esc(t[1])}</em><br><a href="${esc(c.source_url)}" target="_blank" rel="noopener">고정 구현 ↗</a> · 검토 구간 ${c.line_ranges.map(r=>r.join('–')).join(', ')}${(c.additional_spans||[]).map(q=>`<br><a href="${esc(q.source_url)}" target="_blank" rel="noopener">추가 계산 정의 ↗</a> · 검토 구간 ${q.line_ranges.map(r=>r.join('–')).join(', ')}`).join('')}</li>`;}).join('');
  return {overview,inputs,residuals,statistics,limits,claims};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={view};
 if(typeof document!=='undefined')fetch('data/pbfm_dynamic_data_integrated.json').then(r=>{if(!r.ok)throw new Error('Unavailable');return r.json();}).then(d=>{for(const [k,v] of Object.entries(view(d)))document.getElementById(k).innerHTML=v;}).catch(()=>{document.getElementById('overview').textContent='근거 자료를 불러오지 못했습니다. 기록과 고정 출처를 확인하세요.';});
})();
