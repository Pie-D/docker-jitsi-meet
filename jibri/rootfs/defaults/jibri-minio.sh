#!/bin/bash -e
PATH=${PATH}:/usr/local/bin

# Configure Recordings
RECORDINGS_DIR=$1

# Configure MinIO (from environment variables)
MC_PROTOCOL="${MINIO_PROTOCOL:-http}"
MC_ACCESS_KEY="${MINIO_ACCESS_KEY}"
MC_SECRET_KEY="${MINIO_SECRET_KEY}"
MC_ENDPOINT="${MINIO_ENDPOINT}"
MC_BUCKET=`jq -r ".meeting_url" ${RECORDINGS_DIR}/metadata.json | sed -e 's|^[^/]*//||' -e 's|/.*$||' | tr '[:upper:]' '[:lower:]'`

export MC_HOST_jibri="${MC_PROTOCOL}://${MC_ACCESS_KEY}:${MC_SECRET_KEY}@${MC_ENDPOINT}"

# Get Recording Information
RECORDINGS_FILE_NAME=`find ${RECORDINGS_DIR} -type f -name \*.mp4 | sed -e "s|${RECORDINGS_DIR}/||g" | sed -e "s|.mp4||g"`
RECORDINGS_SIZE_HUMAN_READABLE=`du -sh ${RECORDINGS_DIR} | awk -F' ' '{print $1}'`

# Convert MP4 to HLS
mkdir -p ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}
mkdir -p ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}/audio
ffmpeg -i ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}.mp4 -c:v libx264 -c:a aac -b:v 1000k -hls_time 10 -hls_list_size 0 -f hls ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}/${RECORDINGS_FILE_NAME}.m3u8
ffmpeg -i ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}.mp4 -vn -acodec libmp3lame -q:a 2 ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}/audio/${RECORDINGS_FILE_NAME}.mp3
# Move metadata file
mv ${RECORDINGS_DIR}/metadata.json ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}/${RECORDINGS_FILE_NAME}.json
ls ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}/audio
# Delete original MP4 file
rm -f ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME}.mp4

# Upload HLS Files to MinIO
mc cp -r ${RECORDINGS_DIR}/${RECORDINGS_FILE_NAME} jibri/${MC_BUCKET}
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

