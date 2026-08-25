# Go Todo

## Docker 개발 환경

루트의 `.env.example`을 `.env`로 복사하고 비밀번호를 설정합니다.

세 서비스를 한 번에 시작하려면 다음 명령을 실행합니다.

```sh
docker compose up --build
```

소스 변경을 자동으로 반영하려면 Docker Compose 2.22 이상에서 watch 모드를 사용합니다.

```sh
docker compose up --build --watch
```

기본 개발 target에서는 프런트엔드가 Vite HMR을 사용하고, 백엔드는 Go 소스 변경 시 재시작됩니다.

- 웹: `http://127.0.0.1:5173`
- API 직접 접근: `http://127.0.0.1:8080/api`
- PostgreSQL: `127.0.0.1:5432`

종료할 때는 다음 명령을 사용합니다. PostgreSQL 데이터 volume은 유지됩니다.

```sh
docker compose down
```

## Production image 확인

`.env`의 `IMAGE_TARGET`을 `production`으로 변경한 뒤 다음 명령을 실행하면 production image로 세 서비스를 시작합니다. production target에서는 watch 모드를 사용하지 않습니다.

```sh
docker compose up --build
```

- 백엔드는 컴파일된 Go binary를 non-root Alpine image에서 실행합니다.
- 프런트엔드는 빌드된 정적 파일을 non-root NGINX로 제공하고 `/api`를 backend service로 전달합니다.

각 image만 빌드할 수도 있습니다.

```sh
docker build -t go-todo-backend ./backend
docker build -t go-todo-frontend ./frontend
```

Dockerfile의 마지막 stage가 production이므로 별도 target을 지정하지 않아도 됩니다.

## 호스트에서 직접 개발

PostgreSQL만 Docker로 시작합니다.

```sh
docker compose up postgres
```

별도 터미널에서 backend와 frontend를 실행합니다.

```sh
cd backend
go run ./cmd/server
```

```sh
cd frontend
npm run dev
```
