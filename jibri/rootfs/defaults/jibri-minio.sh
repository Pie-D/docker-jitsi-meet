#!/bin/bash -e
PATH=${PATH}:/usr/local/bin
# Configure Recordings
RECORDINGS_DIR=$1
# Configure MinIO
MC_PROTOCOL="http"
MC_ACCESS_KEY=""
MC_SECRET_KEY=""
MC_ENDPOINT="103.252.1.141:9000"
MC_BUCKET=`jq -r ".meeting_url" ${RECORDINGS_DIR}/metadata.json | sed -e 's|^[^/]*//||' -e 's|/.*$||' | tr '[:upper:]' '[:lower:]'`
export MC_HOST_jibri="${MC_PROTOCOL}://${MC_ACCESS_KEY}:${MC_SECRET_KEY}@${MC_ENDPOINT}"
# Get Recording Information
RECORDINGS_FILE_NAME=`find ${RECORDINGS_DIR} -type f -name \*.mp4 | sed -e "s|${RECORDINGS_DIR}/||g" | sed -e "s|.mp4||g"`
RECORDINGS_SIZE_HUMAN_READABLE=`du -sh ${RECORDINGS_DIR} | awk -F' ' '{print $1}'`
# Upload Recording Files to MinIO
mv ${RECORDINGS_DIR}/metadata.json ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}.json
mc cp ${RECORDINGS_DIR}/* jibri/${MC_BUCKET}
# Remove Recording Directory
rm -rf ${RECORDINGS_DIR}
# Set Upload Status to OK
UPLOAD_STATUS="OK"
# Logs MinIO
{
  echo "------------------------------------------"; \
  echo "MinIO Host     : ${MC_ENDPOINT}"; \
  echo "MinIO Bucket   : ${MC_BUCKET}"; \
  echo "Recording Dir  : ${RECORDINGS_DIR}"; \
  echo "Recording Size : ${RECORDINGS_SIZE_HUMAN_READABLE}"; \
  echo "Upload Status  : ${UPLOAD_STATUS}"; \
  echo "------------------------------------------"; \
  echo ""; \
} >> /var/log/jitsi/jibri/minio.txt
# Unset MinIO Host
unset MC_HOST_jibri
# Done
exit 0