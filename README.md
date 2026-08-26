# Go Todo

> 할 일을 원하는 양식으로 적을 수 있는 Todo 웹 서비스
<br/>
장보기에는 체크리스트가 편하고, 업무에는 우선순위나 날짜가 필요할 수 있습니다.<br/>  
Go Todo에서는 Todo의 형식을 하나로 고정하지 않고, 필요한 양식을 직접 만들어 적습니다.<br/><br/>

서비스 관리자가 사용 가능한 Todo 여러 작성 양식을 만들 수 있습니다.<br/>
사용자는 그 중에서 자신에게 필요한 양식을 골라 자신이 할 일을 적으면 됩니다.<br/><br/>

추가로 코딩하지 않아도 작성 양식에 맞는 할 일 작성 UI가 자동으로 조립돼요.<br/>
처음에는 기본 Checklist Rule로 바로 시작하고, 필요해지면 날짜, 숫자, 선택지, 반복 항목처럼 더 다양한 입력을 추가할 수 있어요.<br/><br/>

지금 그룹 활동을 하는데 체크리스트가 필요하신가요?<br/>
그것도 리스트를 만들어 다른 사람들과 함께 할 일을 공유해 보세요.<br/><br/>  

## 주요 기능

- 회원가입, 로그인, 로그아웃
- 세션 기반 인증
- Todo 생성, 조회, 수정, 완료, 삭제
- 여러 사용자가 함께 쓰는 List
- List의 `owner` / `member` 권한
- JSON Schema 기반 Todo Rule
- RJSF 기반 동적 Todo 폼
- 기본 Checklist Rule
- 관리자 전용 Rule 관리
- 관리자 권한 관리

## 바로 실행하기

Docker와 Docker Compose, Node.js/npm이 필요합니다.

먼저 개발용 환경 변수 파일을 만듭니다.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### macOS / Linux

```sh
cp .env.example .env
```

`.env`의 `POSTGRES_PASSWORD`를 원하는 값으로 바꾼 뒤 실행합니다.

```sh
npm run dev
```

이제 브라우저에서 열 수 있습니다.

- 웹: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8080/api`

상태 확인:

```sh
npm run dev:status
```

로그 확인:

```sh
npm run dev:logs
```

종료:

```sh
npm run dev:down
```

PostgreSQL 데이터는 그대로 유지됩니다.

## 프로젝트 구성

```text
frontend/   React + TypeScript
backend/    Go HTTP API
```

주요 기술:

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- RJSF
- shadcn/ui
- Tailwind CSS
- Go
- PostgreSQL
- pgx
- JSON Schema Draft 2020-12
- Docker Compose

개발 환경에서는 Vite가 `/api` 요청을 Go backend로 전달합니다.

## Production

Production용 환경 변수 파일을 만듭니다.

### Windows PowerShell

```powershell
Copy-Item .env.production.example .env.production
```

### macOS / Linux

```sh
cp .env.production.example .env.production
```

필요한 값을 설정한 뒤 실행합니다.

```sh
npm run prod
```

기본 공개 주소:

```text
http://localhost:8080
```

Production에서는 웹 진입점만 외부에 공개되고, backend와 PostgreSQL은 Compose network 내부에 유지됩니다.

상태와 로그:

```sh
npm run prod:status
npm run prod:logs
```

종료:

```sh
npm run prod:down
```

인터넷에 공개해 로그인 기능을 사용할 경우 HTTPS를 적용하고 `SESSION_SECURE=true`를 유지해야 합니다.
