# Backend Dockerfile
FROM golang:alpine AS builder

# Install build essentials and certs
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Configure reliable Go proxy and timeouts
ENV GOPROXY=https://proxy.golang.org,https://goproxy.io,direct
ENV GOSUMDB=sum.golang.org

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server cmd/server/main.go

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
RUN mkdir -p uploads
EXPOSE 8080
CMD ["./server"]

