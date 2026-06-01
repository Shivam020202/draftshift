New-Item -ItemType Directory -Path A:\npm-cache -Force
New-Item -ItemType Directory -Path A:\npm-temp -Force
$env:TEMP='A:\npm-temp'
$env:TMP='A:\npm-temp'
npm install firebase @google/generative-ai react-markdown lucide-react --cache A:\npm-cache
