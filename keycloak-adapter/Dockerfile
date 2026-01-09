# ------------------------------------------------------------------------------
# trivy to generate SBOM
# ------------------------------------------------------------------------------
FROM ghcr.io/aquasecurity/trivy:latest AS trivy
RUN trivy image --format spdx-json --output /container.json denoland/deno

# ------------------------------------------------------------------------------
# prod
# ------------------------------------------------------------------------------
FROM denoland/deno
LABEL version="v20250911"

WORKDIR /app

COPY --from=trivy /container.json /SBOM/container.json
COPY config.ts context.ts adapter.ts /app/

RUN deno cache /app/adapter.ts && \
    deno info /app/adapter.ts --json > /SBOM/application-dependencies.json

USER deno
EXPOSE 9000

CMD \
    [ "$(echo $ALLOW_UNSECURE_CERT | tr '[:upper:]' '[:lower:]')" = true ] && \
        IGNORE_CERT_ERRORS="--unsafely-ignore-certificate-errors"; \
\
    deno run --allow-net --allow-env $IGNORE_CERT_ERRORS /app/adapter.ts