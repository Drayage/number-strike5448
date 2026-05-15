# Number Challenge

PDF 기획서를 바탕으로 만든 숫자야구 로그라이크 미니 게임입니다.

## 실행

`index.html`을 브라우저에서 열면 바로 플레이할 수 있습니다.

모바일에서는 프로젝트 폴더를 그대로 휴대폰에 옮긴 뒤 `index.html`을 열면 됩니다. 웹 서버에 올리면 홈 화면 설치와 오프라인 캐시도 동작합니다.

## 포함된 규칙

- 1~5라운드: 1~5자리, 숫자 중복 불가
- 6~14라운드: 3~11자리, 숫자 중복 가능
- 15라운드: 12자리 보스 라운드
- 16라운드 이후: 무한 모드
- 오답 시 HP 1 감소, HP 0이면 저장 데이터 삭제
- 시도 횟수에 따른 Perfect, Great, Good, Normal 보상
- 상점 아이템: 체력 물약, 심장 확장기, 숫자 제거기, 위치 고정장치, 분석용 돋보기
- 모바일 터치 입력용 숫자 패드

## 테스트

```powershell
& 'C:\Users\ccssh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\tests\game-core.test.cjs
```
