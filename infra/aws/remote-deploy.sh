#!/bin/bash
# Zero-downtime deploy on the EC2 host. GitHub Actions sends this through
# SSM with IMAGE (full ECR image URI) and CORS_ORIGIN exported.
#
# Two slots, blue (:3001) and green (:3002). Start the new image in the idle
# slot, wait for /health, point nginx at it (reload is graceful: in-flight
# requests finish on the old container), then remove the old container.
set -euo pipefail

: "${IMAGE:?IMAGE is required}"
: "${CORS_ORIGIN:?CORS_ORIGIN is required}"
REGION=us-east-1
LOG_GROUP=/courseflow/backend
UPSTREAM=/etc/nginx/courseflow-upstream.inc

if grep -q ':3001;' "$UPSTREAM"; then
    NEW_PORT=3002 NEW=courseflow-green OLD=courseflow-blue
else
    NEW_PORT=3001 NEW=courseflow-blue OLD=courseflow-green
fi
echo "Deploying $IMAGE to $NEW (:$NEW_PORT)"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${IMAGE%%/*}"
docker pull "$IMAGE"

docker rm -f "$NEW" >/dev/null 2>&1 || true
docker run -d --name "$NEW" --restart unless-stopped \
    -p "127.0.0.1:$NEW_PORT:3001" \
    -e NODE_ENV=production -e PORT=3001 -e CORS_ORIGIN="$CORS_ORIGIN" \
    --log-driver awslogs \
    --log-opt awslogs-region="$REGION" \
    --log-opt awslogs-group="$LOG_GROUP" \
    --log-opt awslogs-stream="$NEW-$(date +%Y%m%d-%H%M%S)" \
    "$IMAGE"

healthy=false
for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:$NEW_PORT/health" >/dev/null; then
        healthy=true
        break
    fi
    sleep 2
done

if [ "$healthy" != true ]; then
    echo "New container failed its health check; keeping $OLD live."
    docker logs --tail 50 "$NEW" || true
    docker rm -f "$NEW"
    exit 1
fi

echo "server 127.0.0.1:$NEW_PORT;" > "$UPSTREAM"
nginx -t
systemctl reload nginx
echo "nginx now routes to $NEW"

sleep 5 # let requests still on the old container finish
docker rm -f "$OLD" >/dev/null 2>&1 || true
docker image prune -f >/dev/null
echo "Deployed $IMAGE"
