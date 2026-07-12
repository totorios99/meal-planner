#!/usr/bin/env python3
# TikTok photo-carousel posts (/photo/...) have no video stream, so yt-dlp's
# CLI JSON never surfaces the per-slide images (imagePost.images). The raw
# itemStruct returned by TikTokIE's own web-data fetch (challenge-solving
# included) does carry it — this just calls that internal method directly
# and prints the slide image URLs as JSON.
import json
import re
import sys

import yt_dlp
from yt_dlp.extractor.tiktok import TikTokIE

url = sys.argv[1]
m = re.search(r'tiktok\.com/@([\w.-]+)/(?:video|photo)/(\d+)', url)
if not m:
    print(json.dumps({'error': f'not a tiktok post URL: {url}'}))
    sys.exit(1)
user, post_id = m.groups()
video_url = f'https://www.tiktok.com/@{user}/video/{post_id}'

ydl = yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True})
ie = TikTokIE()
ie.set_downloader(ydl)
data, status = ie._extract_web_data_and_status(video_url, post_id)

image_post = data.get('imagePost') if data else None
if not image_post:
    print(json.dumps({'error': 'no imagePost data (not a photo post, or extraction blocked)'}))
    sys.exit(1)

print(json.dumps({
    'caption': data.get('desc', ''),
    'images': [img['imageURL']['urlList'][0] for img in image_post['images']],
}))
