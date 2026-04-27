# Audit: Time Compass Graphics Assets

## TimeCompass_Intro.mp4

The symlink `public/TimeCompass_Intro.mp4 -> ../graphics/TimeCompass_Intro.mp4`
has been replaced with the real MP4 file placed directly at
`public/TimeCompass_Intro.mp4`. Do not convert it back to a symlink.

If the file is ever lost, place the real MP4 directly at `public/TimeCompass_Intro.mp4`
before running `./build-cdn.sh`. The build script will warn (but not abort) if it
is absent.

## cover.png

`public/cover.png` is a real file and is used as the static fallback image
shown when the intro video fails to load. Do not delete or move it.
