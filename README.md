# Go Todo

## 개발 환경

Docker Compose 2.22 이상과 [Task](https://taskfile.dev/docs/installation)가 필요합니다. Windows에서는 다음 명령으로 Task를 설치할 수 있습니다.

```powershell
winget install Task.Task
```

먼저 개발용 환경 변수 파일을 준비하고 비밀번호를 변경합니다.

```sh
cp .env.example .env
```

PowerShell에서는 다음 명령을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env
```

개발 환경을 시작합니다.

```sh
task dev
```

최초 실행에는 image build가 필요하지만, 이후 일반 소스 변경 때문에 image를 다시 빌드할 필요는 없습니다.

- frontend 소스는 실행 중인 container에 동기화되고 Vite HMR로 반영됩니다.
- backend 소스는 실행 중인 container에 동기화된 다음 `go run` 프로세스가 재시작됩니다.
- `package.json`, `package-lock.json`, `go.mod`, `go.sum` 변경은 의존성 설치가 필요하므로 해당 image를 자동으로 다시 빌드합니다.

- 웹: `http://127.0.0.1:5173`
- API 직접 접근: `http://127.0.0.1:8080/api`
- PostgreSQL: `127.0.0.1:5432`

종료할 때 PostgreSQL 데이터 volume은 유지됩니다.

```sh
task dev:down
```

## 공개 배포 환경

배포 서버에서는 개발용 `.env`를 재사용하지 않고 production 예제에서 별도 환경 변수 파일을 만듭니다. `POSTGRES_PASSWORD`는 반드시 새로운 값으로 변경합니다.

```sh
cp .env.production.example .env.production
```

PowerShell에서는 다음 명령을 사용할 수 있습니다.

```powershell
Copy-Item .env.production.example .env.production
```

공개 배포 환경을 시작합니다.

```sh
task prod
```

- frontend만 `${PUBLIC_BIND_ADDRESS}:${PUBLIC_PORT}`로 호스트에 공개됩니다. 기본값은 `0.0.0.0:8080`입니다.
- backend와 PostgreSQL은 Compose 내부 network에서만 접근할 수 있습니다.
- backend는 컴파일된 Go binary를 non-root Alpine image에서 실행합니다.
- frontend는 빌드된 정적 파일을 non-root NGINX로 제공하고 `/api` 요청을 backend로 전달합니다.
- production 환경에는 소스 동기화와 Watch 설정이 적용되지 않습니다.

공개 인터넷에서 로그인 기능을 사용할 때는 앞단에서 HTTPS를 종료해야 하며 `SESSION_SECURE=true`를 유지해야 합니다.

상태와 로그는 다음과 같이 확인합니다.

```sh
task prod:status
task prod:logs
```

종료할 때는 다음 명령을 사용합니다.

```sh
task prod:down
```

## Image만 빌드하기

각 image만 빌드할 수도 있습니다.

```sh
docker build -t go-todo-backend ./backend
docker build -t go-todo-frontend ./frontend
```

Dockerfile의 마지막 stage가 production이므로 별도 target을 지정하지 않아도 됩니다.
