FROM etherpad/etherpad:2.0.3

USER root
# Install LibreOffice and fonts for PDF/document export with Vietnamese support
RUN apk add --no-cache libreoffice ttf-dejavu font-noto
USER etherpad

# Install the table plugin
RUN pnpm run install-plugins ep_tables4

# Patch the spacebar issue in table cells (IME composition issue)
RUN sed -i 's/var printViewTblTDStyles = "padding: 5px 7px;word-wrap: break-word!important;"/var printViewTblTDStyles = "padding: 5px 7px;word-wrap: break-word!important;white-space: pre-wrap !important;"/' /opt/etherpad-lite/src/node_modules/ep_tables4/static/js/datatables-renderer.js

# Copy and run the patch script
COPY --chown=etherpad:etherpad patch_datatables.js /tmp/patch_datatables.js
RUN node /tmp/patch_datatables.js && rm /tmp/patch_datatables.js
