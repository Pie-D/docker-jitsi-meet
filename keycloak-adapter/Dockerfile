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
RUN \
    deno cache /app/adapter.ts && \
    deno info /app/adapter.ts --json > /SBOM/application-dependencies.json

ENV KEYCLOAK_ORIGIN "https://iam.cmcati.vn"
ENV KEYCLOAK_ORIGIN_INTERNAL ""
ENV KEYCLOAK_REALM "CIST_1"
ENV KEYCLOAK_CLIENT_ID "c-meet-online"
ENV JWT_ALG "HS256"
ENV JWT_HASH "SHA-256"
ENV JWT_APP_ID "app_id"
ENV JWT_APP_SECRET "app_secret"
ENV JWT_EXP_SECOND 604800
ENV ALLOW_UNSECURE_CERT false
ENV HOSTNAME "0.0.0.0"
ENV PORT 9000

USER deno
EXPOSE 9000

CMD \
    [ "$(echo $ALLOW_UNSECURE_CERT | tr '[:upper:]' '[:lower:]')" = true ] && \
        IGNORE_CERT_ERRORS="--unsafely-ignore-certificate-errors"; \
\
    deno run --allow-net --allow-env $IGNORE_CERT_ERRORS /app/adapter.ts