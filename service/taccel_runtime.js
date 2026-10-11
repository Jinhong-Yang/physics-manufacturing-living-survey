'use strict';
fetch('data/taccel_dependency_pair.json').then(response=>{
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(evidence=>{
  const target=document.getElementById('taccel-runtime-status');if(!target)return;
  const original=evidence.variants.find(path=>path.variant==='original_py310');
  const adapted=evidence.variants.find(path=>path.variant==='adapted_py310');
  target.textContent=`같은 Python 3.10과 RTX 5080에서 지정 PyTorch 2.5.1/CUDA 12.4 경로는 ${original.result.passed_case_count}/${original.result.case_count}개, 변경한 PyTorch 2.7.1/CUDA 12.8 경로는 ${adapted.result.passed_case_count}/${adapted.result.case_count}개 GPU 연산이 수치 비교를 통과했습니다. 변경 경로는 원본 의존성을 그대로 따른 결과와 구분합니다. 작은 연산의 통과로 Taccel 시뮬레이션이나 촉각 생성 성공을 판정하지 않습니다.`;
}).catch(()=>{
  const target=document.getElementById('taccel-runtime-status');
  if(target)target.textContent='실행 환경 기록을 불러올 수 없습니다. 연결된 근거 파일을 확인하세요.';
});
