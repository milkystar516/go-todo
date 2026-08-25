# Go Todo

React, Go, PostgreSQL을 하나의 Docker Compose project로 실행하는 monorepo입니다.

## 로컬 개발

최초 한 번만 저장소 루트에서 개발 환경 변수 파일을 준비합니다.

```powershell
Copy-Item .env.example .env
```

`.env`의 `POSTGRES_PASSWORD`를 변경한 다음 전체 stack을 실행합니다.

```sh
docker compose up -d
```

Docker Compose가 `compose.yaml`과 `compose.override.yaml`을 자동으로 병합하므로 별도의 `-f`나 `--env-file` 옵션은 필요하지 않습니다.
Frontend 소스 변경은 Vite HMR로 즉시 반영되고, backend Go 소스 변경은 자동으로 다시 빌드하여 서버를 재시작합니다.
Dockerfile이나 의존성이 변경되어 image를 다시 만들어야 할 때만 `docker compose up -d --build`를 사용합니다.

- 웹: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8080/api`
- PostgreSQL: `127.0.0.1:5432`

상태와 로그는 다음 명령으로 확인합니다.

```sh
docker compose ps
docker compose logs -f
```

종료할 때 PostgreSQL volume은 유지됩니다.

```sh
docker compose down
```

### 단축 명령

[Task](https://taskfile.dev/docs/installation)를 설치했다면 다음 명령으로 같은 개발 환경을 실행할 수 있습니다.

```powershell
winget install Task.Task
task dev
```

종료하려면 다음 명령을 실행합니다.

```sh
task dev:down
```

## 공개 배포

배포 서버에서는 별도의 production 환경 변수 파일을 준비하고 비밀번호를 변경합니다. `task prod` 단축 명령을 사용하므로 Task가 설치되어 있어야 합니다.

```sh
cp .env.production.example .env.production
task prod
```

Windows PowerShell에서는 첫 번째 명령 대신 다음 명령을 사용합니다.

```powershell
Copy-Item .env.production.example .env.production
```

기본 공개 주소는 `http://localhost:8080`입니다. Production에서는 frontend만 공개되며 backend와 PostgreSQL은 Compose network 내부에 남습니다.

```sh
task prod:status
task prod:logs
task prod:down
```

공개 인터넷에서 로그인 기능을 사용할 때는 앞단에서 HTTPS를 종료하고 `SESSION_SECURE=true`를 유지해야 합니다.
