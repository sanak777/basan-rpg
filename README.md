# 바카라산악회 RPG v3

## 실행
- Node.js 18 이상 권장
- `npm install`
- `npm start`
- 브라우저에서 `http://localhost:3000`

## Render 배포
- Build Command: `npm install`
- Start Command: `npm start`
- 캐릭터 영구 저장을 위해 Render Web Service에 Persistent Disk를 연결하세요.
  - Mount Path: `/opt/render/project/src/.data`
  - Environment Variable: `DATA_DIR=/opt/render/project/src/.data`
- 디스크 없이 배포하면 Render 인스턴스 교체/재시작 시 저장 데이터가 사라질 수 있습니다.

## v3 변경점
- 기존 v2의 실시간 멀티플레이, 이동, 공격, 스킬, 드롭, 가방 기능 유지
- 직업별 캐릭터 이름 및 최초 선택 직업 유지
- 캐릭터 레벨, 경험치, 골드, HP, 인벤토리, 장비를 JSON 저장소에 기록
- 몬스터 종류 확장: 슬라임, 고블린, 늑대, 오크, 해골 기사, 거대 거미, 데스나이트, 불의 정령, 드래곤
- 저장 키는 캐릭터 이름 기준입니다. 실제 서비스 공개 전에는 계정 로그인/비밀번호 및 운영자 인증을 추가해야 합니다.

## 주의
현재 버전은 프로토타입입니다. 이름만으로 캐릭터를 불러오는 구조이므로 공개 서버에서 개인 계정 보안이 보장되지 않습니다.
운영자 삭제 기능은 인증 체계가 갖춰진 다음 추가하는 것이 안전합니다.
