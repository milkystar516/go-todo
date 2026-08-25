ARG GO_VERSION=1.26.5

FROM --platform=$BUILDPLATFORM golang:${GO_VERSION}-alpine AS dependencies
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

FROM dependencies AS development
COPY . .
EXPOSE 8080
CMD ["go", "run", "./cmd/server"]

FROM development AS build
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.23 AS production
RUN addgroup -S app \
    && adduser -S -G app app
COPY --from=build --chown=app:app /out/server /usr/local/bin/server
USER app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/server"]
