# Number Strike — 숫자 추리 게임 (상점/아이템/보스)

바닐라 JS. 어린이 모드, 아이템 상점, 추론 메모 시스템, PWA, GitHub Pages 배포.

## 파일 지도

- `src/app.js` (~1,300줄) — UI/진행/상점/메모 대부분. 큼: Grep으로 부분 읽기.
- `src/game-core.js` — 추리 판정 코어
- `index.html`, `sw.js` — 셸/PWA 캐시

## 규칙

- 아이템(eliminator/locker/parity/counter/signal/mouth/updown 등) 효과 변경 시
  어린이 모드의 자동 메모(단순 소거법) 반영 여부를 함께 확인할 것 — 두 시스템이 연동됨.
- 자동완성 후보 계산에는 시간 예산이 걸려 있다 — 무거운 탐색 추가 금지.
- 모바일 버튼 배치는 여러 번 수정 끝에 확정된 상태 — 레이아웃 변경 시 360×640
  스크린샷으로 확인 후 커밋 (webgame-ship 스킬의 검증 절차).
- SW/캐시/배포: webgame-ship 스킬 참조.
