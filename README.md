# Go Todo

React, Go, PostgreSQL을 하나의 Docker Compose project로 실행하는 monorepo입니다.

## 로컬 개발

최초 한 번만 저장소 루트에서 개발 환경 변수 파일을 준비합니다.

```powershell
Copy-Item .env.example .env
```

`.env`의 `POSTGRES_PASSWORD`를 변경한 다음 전체 stack을 실행합니다.

```sh
npm run dev
```

이 명령은 `docker compose watch`를 실행해 image build와 전체 stack 시작까지 수행합니다. Frontend 소스 변경은 Vite HMR로 즉시 반영되고, backend Go 소스 변경은 container를 재시작해 반영됩니다. 의존성 파일이 변경되면 해당 image를 자동으로 다시 빌드합니다.

- 웹: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8080/api`
- PostgreSQL: `127.0.0.1:5432`

상태와 로그는 다음 명령으로 확인합니다.

```sh
npm run dev:status
npm run dev:logs
```

종료할 때 PostgreSQL volume은 유지됩니다.

```sh
npm run dev:down
```

## 공개 배포

배포 서버에서는 별도의 production 환경 변수 파일을 준비하고 비밀번호를 변경합니다.

```sh
cp .env.production.example .env.production
npm run prod
```

Windows PowerShell에서는 첫 번째 명령 대신 다음 명령을 사용합니다.

```powershell
Copy-Item .env.production.example .env.production
```

기본 공개 주소는 `http://localhost:8080`입니다. Production에서는 frontend만 공개되며 backend와 PostgreSQL은 Compose network 내부에 남습니다.

```sh
npm run prod:status
npm run prod:logs
npm run prod:down
```

공개 인터넷에서 로그인 기능을 사용할 때는 앞단에서 HTTPS를 종료하고 `SESSION_SECURE=true`를 유지해야 합니다.
