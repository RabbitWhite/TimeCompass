# Audit: Time Compass Graphics Assets

## TimeCompass_Intro.mp4

The symlink `public/TimeCompass_Intro.mp4 -> ../graphics/TimeCompass_Intro.mp4`
has been removed. The real MP4 file **must be placed directly at
`public/TimeCompass_Intro.mp4`** before running `./build-cdn.sh`.

The build script will warn (but not abort) if the file is absent.

## cover.png

`public/cover.png` is a real file and is used as the static fallback image
shown when the intro video fails to load. Do not delete or move it.
