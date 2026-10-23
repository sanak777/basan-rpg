# 바카라산악회 RPG v1

## 실행
- Node.js 18 이상
- `npm install`
- `npm start`
- 브라우저에서 `http://localhost:3000`

## Render 배포
1. 이 프로젝트를 GitHub 저장소에 업로드합니다.
2. Render에서 New > Web Service로 저장소를 연결합니다.
3. Runtime: Node, Build Command: `npm install`, Start Command: `npm start`
4. 배포 후 생성된 URL을 회원들과 공유합니다.

## v1 기능
- 같은 서버에 접속한 여러 플레이어 실시간 표시
- 모바일 터치 조이스틱 / 공격 버튼, PC WASD/방향키와 스페이스
- 슬라임/고블린 사냥, 경험치, 레벨업, 골드

## 참고
현재 v1은 프로토타입입니다. 계정/비밀번호, 영구 저장, 아이템/인벤토리, PvP, 치트 방지, 운영자 도구는 아직 구현하지 않았습니다. 현재 캐릭터 데이터는 서버 메모리에 있어 서버 재시작 시 초기화됩니다.
